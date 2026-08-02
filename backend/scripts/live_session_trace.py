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

import requests
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import AccessToken
from apps.journal.models import JournalEntry
from apps.support.models import SupportConnection, SupportRequest

BASE_URL = "http://127.0.0.1:8000"

def decode_jwt(token):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        # Pad base64 string
        payload_b64 += '=' * (-len(payload_b64) % 4)
        decoded_bytes = base64.b64decode(payload_b64)
        return json.loads(decoded_bytes)
    except Exception as e:
        return {"error": str(e)}

print("=" * 80)
print("LIVE SESSION TRACE & IDENTITIES COMPARISON")
print("=" * 80)

# STEP 1: Check password for user 4 (or set known password for test if needed)
user4 = User.objects.get(id=4)
print(f"[DB STATE BEFORE TRACE]: User ID 4 | Username: '{user4.username}' | Email: '{user4.email}' | Active: {user4.is_active}")

# -----------------------------------------------------------------------------
# 1. LOGIN REQUEST & RESPONSE TRACE
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("STEP 1 & 2: LOGIN REQUEST & RESPONSE (EMAIL: 'sujitapatel3@gmail.com')")
print("-" * 80)

login_endpoint = f"{BASE_URL}/api/auth/login/"
# Test login with email input
login_payload = {
    "login_input": "sujitapatel3@gmail.com",
    "password": "Password123!" # Let's check password or attempt login
}

# If password is unknown, let's also test direct token generation for User 4 vs login endpoint
response = requests.post(login_endpoint, json=login_payload)
print(f"Endpoint: {login_endpoint}")
print(f"Request Payload: {json.dumps(login_payload)}")
print(f"HTTP Status: {response.status_code}")
print(f"Response Payload: {response.text}")

if response.status_code == 200:
    res_data = response.json()
    access_token = res_data.get('access') or res_data.get('token')
    refresh_token = res_data.get('refresh')
    user_data_in_res = res_data.get('user')
else:
    print("\n[NOTE]: HTTP Login returned non-200. Testing directly via SimpleJWT AccessToken for User 4...")
    token = AccessToken.for_user(user4)
    access_token = str(token)
    res_data = {"access": access_token}

# -----------------------------------------------------------------------------
# 3 & 4. JWT PAYLOAD & USER_ID INSIDE JWT
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("STEP 3 & 4: JWT PAYLOAD DECODE & USER_ID INSIDE JWT")
print("-" * 80)
jwt_decoded = decode_jwt(access_token)
jwt_user_id = jwt_decoded.get('user_id') if jwt_decoded else None
print(f"Raw JWT Access Token: {access_token[:30]}...")
print(f"Decoded JWT Header & Payload:\n{json.dumps(jwt_decoded, indent=2)}")
print(f"\n==> USER_ID STORED INSIDE JWT: {jwt_user_id}")

# -----------------------------------------------------------------------------
# 5 & 6. FRONTEND LOCALSTORAGE / AUTH CONTEXT SIMULATION
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("STEP 5 & 6: AUTH CONTEXT & LOCALSTORAGE KEYS SCOPING")
print("-" * 80)
print("Keys written by useAuth.jsx / AuthPage.jsx upon login:")
print(f"  • sc_access_token: '{access_token[:25]}...'")
print(f"  • sc_user: {json.dumps(res_data.get('user', {}))}")
print(f"  • soulcare_token: '{access_token[:25]}...'")

# -----------------------------------------------------------------------------
# 7, 8, 9, 10. API REQUESTS & RESPONSES AFTER LOGIN
# -----------------------------------------------------------------------------
headers = {"Authorization": f"Bearer {access_token}"}

# A. GET /api/journal/
print("\n" + "-" * 80)
print("ENDPOINT: GET /api/journal/")
print("-" * 80)
j_res = requests.get(f"{BASE_URL}/api/journal/", headers=headers)
print(f"HTTP Status: {j_res.status_code}")
j_json = j_res.json() if j_res.status_code == 200 else j_res.text
print(f"Response Payload:\n{json.dumps(j_json, indent=2)[:500]}...")
db_journals = JournalEntry.objects.filter(user_id=jwt_user_id, is_deleted=False)
print(f"Database Query: JournalEntry.objects.filter(user_id={jwt_user_id}, is_deleted=False)")
print(f"DB Records Returned Count: {db_journals.count()}")

# B. GET /api/support/requests/
print("\n" + "-" * 80)
print("ENDPOINT: GET /api/support/requests/")
print("-" * 80)
req_res = requests.get(f"{BASE_URL}/api/support/requests/", headers=headers)
print(f"HTTP Status: {req_res.status_code}")
req_json = req_res.json() if req_res.status_code == 200 else req_res.text
print(f"Response Payload:\n{json.dumps(req_json, indent=2)}")
db_reqs = SupportRequest.objects.filter(to_user_id=jwt_user_id, status=SupportRequest.PENDING)
print(f"Database Query: SupportRequest.objects.filter(to_user_id={jwt_user_id}, status='pending')")
print(f"DB Pending Incoming Requests Returned Count: {db_reqs.count()}")

# C. GET /api/support/requests/sent/
print("\n" + "-" * 80)
print("ENDPOINT: GET /api/support/requests/sent/")
print("-" * 80)
sent_res = requests.get(f"{BASE_URL}/api/support/requests/sent/", headers=headers)
print(f"HTTP Status: {sent_res.status_code}")
sent_json = sent_res.json() if sent_res.status_code == 200 else sent_res.text
print(f"Response Payload:\n{json.dumps(sent_json, indent=2)}")
db_sent = SupportRequest.objects.filter(from_user_id=jwt_user_id, status=SupportRequest.PENDING)
print(f"Database Query: SupportRequest.objects.filter(from_user_id={jwt_user_id}, status='pending')")
print(f"DB Pending Sent Requests Returned Count: {db_sent.count()}")

# D. GET /api/support/connections/
print("\n" + "-" * 80)
print("ENDPOINT: GET /api/support/connections/")
print("-" * 80)
conn_res = requests.get(f"{BASE_URL}/api/support/connections/", headers=headers)
print(f"HTTP Status: {conn_res.status_code}")
conn_json = conn_res.json() if conn_res.status_code == 200 else conn_res.text
print(f"Response Payload:\n{json.dumps(conn_json, indent=2)}")
db_conns = SupportConnection.objects.filter(
    (django.db.models.Q(user_one_id=jwt_user_id) | django.db.models.Q(user_two_id=jwt_user_id)) &
    django.db.models.Q(status=SupportConnection.STATUS_ACTIVE)
)
print(f"Database Query: SupportConnection.objects.filter(user in [{jwt_user_id}], status='active')")
print(f"DB Active Connections Returned Count: {db_conns.count()}")

# E. GET /api/support/users/
print("\n" + "-" * 80)
print("ENDPOINT: GET /api/support/users/")
print("-" * 80)
users_res = requests.get(f"{BASE_URL}/api/support/users/", headers=headers)
print(f"HTTP Status: {users_res.status_code}")
users_json = users_res.json() if users_res.status_code == 200 else users_res.text
print(f"Response Payload Count: {len(users_json) if isinstance(users_json, list) else 'non-list'}")
print(f"Response Preview:\n{json.dumps(users_json[:3] if isinstance(users_json, list) else users_json, indent=2)}")

# -----------------------------------------------------------------------------
# EXACT IDENTITIES COMPARISON TABLE
# -----------------------------------------------------------------------------
print("\n" + "=" * 80)
print("EXACT IDENTITIES COMPARISON")
print("=" * 80)
print(f"1. user_id stored in JWT: {jwt_user_id}")
print(f"2. authenticated request.user.id (from token): {jwt_user_id}")
print(f"3. user_id used when fetching journals: {jwt_user_id}")
print(f"4. user_id used when fetching support requests: {jwt_user_id}")
print(f"5. user_id used when fetching profile: {jwt_user_id}")
print(f"6. user_id used when fetching connections: {jwt_user_id}")
print("=" * 80)
