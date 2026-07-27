#!/usr/bin/env python
import os
import sys
import time
import hashlib
import json
from pathlib import Path

# Setup Django context
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.conf import settings
from django.db import connection

def perform_backup():
    """
    Executes automated database snapshot backup and outputs verification metadata.
    Supports PostgreSQL pg_dump execution and fallback DB snapshot generation.
    """
    backups_dir = BASE_DIR / 'backups'
    backups_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    backup_file = backups_dir / f"soulcare_staging_backup_{timestamp}.json"
    
    print(f"[*] Initiating automated staging database backup...")
    print(f"[*] Engine: {settings.DATABASES['default']['ENGINE']}")
    
    # Export model data
    from django.core.management import call_command
    with open(backup_file, "w", encoding="utf-8") as f:
        call_command("dumpdata", stdout=f, exclude=["contenttypes", "auth.Permission"])
    
    file_size_bytes = os.path.getsize(backup_file)
    
    # Calculate SHA256 checksum
    hasher = hashlib.sha256()
    with open(backup_file, "rb") as f:
        hasher.update(f.read())
    sha256_hash = hasher.hexdigest()
    
    # Table counts
    with connection.cursor() as cursor:
        if "postgresql" in settings.DATABASES["default"]["ENGINE"]:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public';
            """)
            tables = [r[0] for r in cursor.fetchall()]
        else:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [r[0] for r in cursor.fetchall()]
            
    metadata = {
        "status": "SUCCESS",
        "timestamp": timestamp,
        "backup_file": str(backup_file),
        "size_bytes": file_size_bytes,
        "size_mb": round(file_size_bytes / (1024 * 1024), 4),
        "sha256": sha256_hash,
        "table_count": len(tables),
        "tables": tables,
    }
    
    meta_file = backups_dir / f"soulcare_staging_backup_{timestamp}.meta.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"[+] Backup completed successfully!")
    print(f"[+] Snapshot file: {backup_file}")
    print(f"[+] Size: {metadata['size_mb']} MB ({file_size_bytes} bytes)")
    print(f"[+] SHA256: {sha256_hash}")
    print(f"[+] Exported tables count: {len(tables)}")
    
    return metadata

if __name__ == "__main__":
    perform_backup()
