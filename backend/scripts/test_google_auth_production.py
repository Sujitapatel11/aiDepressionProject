import urllib.request
import json
import ssl

url = "https://aidepressionproject.onrender.com/api/auth/google/"

print(f"Testing live production Google Auth endpoint: {url}")

# Test 1: Empty POST body
req1 = urllib.request.Request(
    url,
    data=json.dumps({}).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
)

try:
    with urllib.request.urlopen(req1, timeout=10) as resp:
        print("Empty payload HTTP Status:", resp.status)
        print("Empty payload Response:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Empty payload HTTP Error Code:", e.code)
    print("Empty payload Error Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Empty payload Failure:", str(e))

print("-" * 60)

# Test 2: Invalid id_token string
req2 = urllib.request.Request(
    url,
    data=json.dumps({"id_token": "INVALID_TEST_TOKEN_STRING"}).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
)

try:
    with urllib.request.urlopen(req2, timeout=10) as resp:
        print("Invalid token HTTP Status:", resp.status)
        print("Invalid token Response:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Invalid token HTTP Error Code:", e.code)
    print("Invalid token Error Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Invalid token Failure:", str(e))
