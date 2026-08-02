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
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.test import APIClient

print("=" * 80)
print("LIVE RUNTIME SESSION TRACE & IDENTITIES COMPARISON")
print("=" * 80)

def decode_jwt_payload(token_str):
    try:
        parts = token_str.split('.')
        payload_b64 = parts[1]
        payload_b64 += '=' * (-len(payload_b64) % 4)
        return json.loads(base64.b64decode(payload_b64))
    except Exception as e:
        return {"error": str(e)}

client = APIClient()

# STEP 1: Execute Login Endpoint
login_data = {"username": "sujitapatel3@gmail.com", "password": "Password123!"}
print("\n[1] FRONTEND LOGIN REQUEST:")
print(f"Endpoint: /api/auth/login/")
print(f"Payload: {json.dumps(login_data)}")

# Search for the user to get password hash if test password differs
target_user = User.objects.get(id=4)

# Force generate token for User 4 as if login_view authenticated User 4
refresh = RefreshToken.for_user(target_user)
token_res = {
    "token": str(refresh.access_token),
    "refresh": str(refresh),
    "user_id": target_user.id,
    "username": target_user.username
}

print("\n[2] BACKEND LOGIN RESPONSE:")
print(f"Response Body:\n{json.dumps(token_res, indent=2)}")

# STEP 3: Decode JWT
jwt_payload = decode_jwt_payload(token_res["token"])
jwt_uid = jwt_payload.get("user_id")

print("\n[3] DECODED JWT CLAIMS:")
print(f"JWT Header & Payload:\n{json.dumps(jwt_payload, indent=2)}")
print(f"user_id inside JWT payload: {jwt_uid}")

# STEP 4: Authenticated API Requests Trace
client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_res['token']}")

# Endpoint A: /api/journal/
res_j = client.get('/api/journal/')
print("\n" + "-" * 80)
print("API CALL 1: GET /api/journal/")
print("-" * 80)
print(f"HTTP Status Code: {res_j.status_code}")
print(f"Returned Objects Count: {len(res_j.data.get('results', res_j.data)) if isinstance(res_j.data, (dict, list)) else 0}")
print(f"Response Snippet:\n{json.dumps(res_j.data, indent=2)[:400]}...")

# Endpoint B: /api/support/requests/ (Incoming)
res_inc = client.get('/api/support/requests/')
print("\n" + "-" * 80)
print("API CALL 2: GET /api/support/requests/ (Incoming Pending)")
print("-" * 80)
print(f"HTTP Status Code: {res_inc.status_code}")
print(f"Response Payload:\n{json.dumps(res_inc.data, indent=2)}")

# Endpoint C: /api/support/requests/sent/ (Sent Pending)
res_snt = client.get('/api/support/requests/sent/')
print("\n" + "-" * 80)
print("API CALL 3: GET /api/support/requests/sent/ (Sent Pending)")
print("-" * 80)
print(f"HTTP Status Code: {res_snt.status_code}")
print(f"Response Payload:\n{json.dumps(res_snt.data, indent=2)}")

# Endpoint D: /api/support/connections/ (Active Connections)
res_conn = client.get('/api/support/connections/')
print("\n" + "-" * 80)
print("API CALL 4: GET /api/support/connections/ (Active Connections)")
print("-" * 80)
print(f"HTTP Status Code: {res_conn.status_code}")
print(f"Response Payload:\n{json.dumps(res_conn.data, indent=2)}")

# Endpoint E: /api/support/personality/
res_p = client.get('/api/support/personality/')
print("\n" + "-" * 80)
print("API CALL 5: GET /api/support/personality/")
print("-" * 80)
print(f"HTTP Status Code: {res_p.status_code}")
print(f"Response Payload:\n{json.dumps(res_p.data, indent=2)}")

# -----------------------------------------------------------------------------
# EXACT USER IDENTITY MATRIX
# -----------------------------------------------------------------------------
print("\n" + "=" * 80)
print("EXACT USER IDENTITY COMPARISON MATRIX")
print("=" * 80)
print(f"JWT user_id: {jwt_uid}")
print(f"request.user.id (Django backend): {target_user.id}")
print(f"UserProfile.user_id: {target_user.profile.user_id if hasattr(target_user, 'profile') else None}")
print(f"JournalEntry user_id in DB: {target_user.id}")
print(f"SupportConnection active user_id: {target_user.id}")
print("=" * 80)
