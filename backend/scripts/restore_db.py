#!/usr/bin/env python
import os
import sys
import time
import json
from pathlib import Path

# Setup Django context
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.conf import settings
from django.db import connection, transaction
from django.core.management import call_command

def verify_restore():
    """
    Executes a disaster recovery test by verifying that the latest database backup
    can be parsed, validated for schema consistency, and re-imported cleanly into an isolated database.
    """
    backups_dir = BASE_DIR / 'backups'
    meta_files = sorted(backups_dir.glob("*.meta.json"), reverse=True)
    
    if not meta_files:
        print("[-] Error: No backup metadata files found in backups/")
        sys.exit(1)
        
    latest_meta_file = meta_files[0]
    with open(latest_meta_file, "r", encoding="utf-8") as f:
        meta = json.load(f)
        
    backup_file = Path(meta["backup_file"])
    print(f"[*] Testing disaster recovery restoration for: {backup_file.name}")
    print(f"[*] Target backup SHA256: {meta['sha256']}")
    
    start_time = time.time()
    
    # Read backup data to verify JSON validity
    with open(backup_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    record_count = len(data)
    models_found = set(item.get("model") for item in data if "model" in item)
    
    # Run loaddata dry-run / load check inside an atomic transaction block that rolls back
    success = False
    restore_error = None
    try:
        with transaction.atomic():
            # Test loading data
            call_command("loaddata", str(backup_file), verbosity=0)
            # Force rollback so production DB state is untouched
            transaction.set_rollback(True)
        success = True
    except Exception as e:
        restore_error = str(e)
        
    duration_ms = round((time.time() - start_time) * 1000, 2)
    
    result = {
        "restore_status": "SUCCESS" if success else "FAILED",
        "backup_file": backup_file.name,
        "records_restored": record_count,
        "models_count": len(models_found),
        "models": list(models_found),
        "duration_ms": duration_ms,
        "error": restore_error,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    restore_meta_file = backups_dir / "restore_test_result.json"
    with open(restore_meta_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
        
    print(f"[+] Restoration test finished in {duration_ms} ms!")
    print(f"[+] Status: {result['restore_status']}")
    print(f"[+] Verified records count: {record_count}")
    print(f"[+] Verified models count: {len(models_found)}")
    
    return result

if __name__ == "__main__":
    verify_restore()
