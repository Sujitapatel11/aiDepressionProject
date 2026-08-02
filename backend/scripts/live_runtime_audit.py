import os
import sys
import json
import base64
import django

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.db import connection
from apps.journal.models import JournalEntry
from apps.support.models import SupportConnection, SupportRequest, UserProfile
from apps.authentication.models import UserAuthProfile
from apps.chat.models import Message

print("=" * 80)
print("LIVE RUNTIME AUDIT & DATABASE EVIDENCE REPORT")
print("=" * 80)

email_target = "sujitapatel3@gmail.com"

# 1. DATABASE RECORD VERIFICATION FOR EMAIL TARGET
print("\n" + "=" * 80)
print(f"VERIFY DATABASE: MATCHING RECORDS FOR EMAIL '{email_target}'")
print("=" * 80)

matching_users = User.objects.filter(email__iexact=email_target).order_by('id')
print(f"Total matching database records (active + inactive): {matching_users.count()}\n")

for u in matching_users:
    j_cnt = JournalEntry.objects.filter(user=u).count()
    j_active = JournalEntry.objects.filter(user=u, is_deleted=False).count()
    
    # Sent / Received Requests
    req_sent = SupportRequest.objects.filter(from_user=u).count()
    req_recv = SupportRequest.objects.filter(to_user=u).count()
    
    # Connections
    conns = SupportConnection.objects.filter(django.db.models.Q(user_one=u) | django.db.models.Q(user_two=u)).count()
    
    # Messages
    msgs_sent = Message.objects.filter(sender=u).count()
    
    has_profile = hasattr(u, 'profile')
    has_auth_profile = hasattr(u, 'auth_profile')
    g_id = u.auth_profile.google_id if has_auth_profile else None
    
    print(f"USER RECORD: ID {u.id}")
    print(f"  |-- Username: '{u.username}'")
    print(f"  |-- Email: '{u.email}'")
    print(f"  |-- is_active: {u.is_active}")
    print(f"  |-- Date Joined: {u.date_joined}")
    print(f"  |-- UserProfile Attached: {has_profile}")
    print(f"  |-- UserAuthProfile Attached: {has_auth_profile} (Google ID: {g_id})")
    print(f"  |-- Journal Count: Total {j_cnt} (Active: {j_active}, Soft-Deleted: {j_cnt - j_active})")
    print(f"  |-- Support Requests: Sent {req_sent}, Received {req_recv}")
    print(f"  |-- Support Connections: {conns}")
    print(f"  +-- Chat Messages Sent: {msgs_sent}")
    print("-" * 50)

# ALSO PRINT DEACTIVATED MERGED USERS MATCHING THE PATTERN
print("\n" + "=" * 80)
print("DEACTIVATED MERGED USERS (HISTORICAL AUDIT)")
print("=" * 80)
merged_users = User.objects.filter(email__icontains="sujitapatel3@gmail.com.merged_4").order_by('id')
for u in merged_users:
    j_cnt = JournalEntry.objects.filter(user=u).count()
    req_sent = SupportRequest.objects.filter(from_user=u).count()
    req_recv = SupportRequest.objects.filter(to_user=u).count()
    conns = SupportConnection.objects.filter(django.db.models.Q(user_one=u) | django.db.models.Q(user_two=u)).count()
    print(f"DEACTIVATED USER: ID {u.id:2d} | Username: {u.username:20s} | Email: {u.email:35s} | Active: {u.is_active} | Journals: {j_cnt} | Requests (Sent/Recv): {req_sent}/{req_recv} | Connections: {conns}")

# 2. CHECK ALL OTHER USERS IN DB TO VERIFY IF DATA BELONGS TO ANOTHER ACCOUNT
print("\n" + "=" * 80)
print("VERIFY SYSTEM-WIDE DATA SUMMARY (ALL USERS)")
print("=" * 80)
print(f"Total System Users: {User.objects.count()}")
print(f"Total System Active Users: {User.objects.filter(is_active=True).count()}")
print(f"Total System Inactive Users: {User.objects.filter(is_active=False).count()}")
print(f"Total System Journals: {JournalEntry.objects.count()}")
print(f"Total System Support Connections: {SupportConnection.objects.count()}")
print(f"Total System Support Requests: {SupportRequest.objects.count()}")
print(f"Total System Chat Messages: {Message.objects.count()}")

print("\n" + "=" * 80)
print("SUPPORT REQUESTS BREAKDOWN IN DATABASE")
print("=" * 80)
all_reqs = SupportRequest.objects.all().order_by('id')
print(f"Total SupportRequest rows: {all_reqs.count()}")
for r in all_reqs[:15]:
    print(f"Request ID {r.id:2d} | Status: '{r.status:10s}' | From: ID {r.from_user_id:2d} ({r.from_user.username:15s}) -> To: ID {r.to_user_id:2d} ({r.to_user.username:15s}) | Created: {r.created_at}")

print("\n" + "=" * 80)
print("SUPPORT CONNECTIONS BREAKDOWN IN DATABASE")
print("=" * 80)
all_conns = SupportConnection.objects.all().order_by('id')
print(f"Total SupportConnection rows: {all_conns.count()}")
for c in all_conns[:15]:
    print(f"Connection ID {c.connection_id} | Status: '{c.status:12s}' | User One: ID {c.user_one_id:2d} ({c.user_one.username:15s}) <-> User Two: ID {c.user_two_id:2d} ({c.user_two.username:15s})")

print("\n" + "=" * 80)
print("END OF LIVE RUNTIME AUDIT REPORT")
print("=" * 80)
