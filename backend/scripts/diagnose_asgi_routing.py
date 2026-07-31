import os
import sys
import django

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("=" * 80)
print("ASGI & CHANNELS RUNTIME DIAGNOSTIC AUDIT")
print("=" * 80)

# Task 1 & 3: Check imports
from apps.chat.routing import websocket_urlpatterns
from apps.chat.consumers import SupportChatConsumer

print("[1] apps.chat.routing import: SUCCESS")
print("[3] SupportChatConsumer import: SUCCESS")

# Task 2: Log websocket_urlpatterns
print("\n[2] websocket_urlpatterns at startup:")
print(websocket_urlpatterns)
for pattern in websocket_urlpatterns:
    print("  - Pattern raw regex:", pattern.pattern.regex.pattern)

# Task 4 & 5 & 6: Test exact URLPattern resolving behavior
test_connection_id = "fbeb0abe-1234-5678-90ab-cdef12345678"
candidate_paths = [
    f"/ws/chat/{test_connection_id}/",
    f"ws/chat/{test_connection_id}/",
    f"/ws/chat/{test_connection_id}",
    f"ws/chat/{test_connection_id}"
]

print("\n[4, 5, 6] Testing URLPattern resolve() and pattern.match():")
url_pattern = websocket_urlpatterns[0]

for path in candidate_paths:
    # Test 1: pattern.resolve(path)
    res = url_pattern.resolve(path)
    # Test 2: pattern.pattern.match(path)
    match = url_pattern.pattern.match(path)
    
    print(f"\nEvaluating Path: '{path}'")
    print(f"  - url_pattern.resolve('{path}'): {res}")
    print(f"  - pattern.match('{path}'): {match}")

# Test if re_path(r"^ws/chat/...") vs re_path(r"^/ws/chat/...") matches
from django.urls import re_path
pattern_with_slash = re_path(r"^/ws/chat/(?P<connection_id>[0-9a-f-]+)/$", SupportChatConsumer.as_asgi())
pattern_without_slash = re_path(r"^ws/chat/(?P<connection_id>[0-9a-f-]+)/$", SupportChatConsumer.as_asgi())

print("\n[7] Comparing re_path regex behaviors on '/ws/chat/fbeb0abe-1234-5678-90ab-cdef12345678/':")
test_path = f"/ws/chat/{test_connection_id}/"
print(f"  - Pattern with leading slash '^/ws/chat/...': resolve() = {pattern_with_slash.resolve(test_path)}")
print(f"  - Pattern without leading slash 'ws/chat/...': resolve() = {pattern_without_slash.resolve(test_path)}")

# Inspect ASGI Application
from config.asgi import application
print("\n[8] ASGI Application initialized cleanly:")
print("  - application type:", type(application))

print("=" * 80)
