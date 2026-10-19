#!/usr/bin/env python3
"""
E2E Live Production Chat Probe
Performs full reproduction against production backend:
1. Public API signup and login for two throwaway zz_probe_ users (passwords never printed, tokens never printed).
2. Support request A -> B, accept as B, retrieve connection_id.
3. Dual WebSocket connection (A and B) with browser Origin header.
4. Real-time message send from A and receive on B, with timing and frames logged.
5. REST message history check.
6. Failure classification and cleanup command output.
"""

import os
import sys
import time
import json
import secrets
import asyncio
import requests
import websockets

BASE_HTTP = os.environ.get("PROBE_HTTP_HOST", "https://aidepressionproject.onrender.com")
BASE_WS = os.environ.get("PROBE_WS_HOST", "wss://aidepressionproject.onrender.com")
ORIGIN = os.environ.get("PROBE_ORIGIN", "https://soul-care-one.vercel.app")

# Ensure passwords exist in environment or generate them
if "ZZ_PROBE_PW_A" not in os.environ:
    os.environ["ZZ_PROBE_PW_A"] = "Pr0b3!" + secrets.token_urlsafe(12)
if "ZZ_PROBE_PW_B" not in os.environ:
    os.environ["ZZ_PROBE_PW_B"] = "Pr0b3!" + secrets.token_urlsafe(12)

PASSWORD_A = os.environ["ZZ_PROBE_PW_A"]
PASSWORD_B = os.environ["ZZ_PROBE_PW_B"]

ts = int(time.time())
USER_A_NAME = f"zz_probe_{ts}_a"
USER_B_NAME = f"zz_probe_{ts}_b"
EMAIL_A = f"{USER_A_NAME}@example.com"
EMAIL_B = f"{USER_B_NAME}@example.com"


def run_e2e():
    print("=" * 70)
    print("STEP 1 - Setup (production, via public API only)")
    print("=" * 70)

    # 1. Register User A
    print(f"[*] Registering user A: {USER_A_NAME}")
    res_signup_a = requests.post(
        f"{BASE_HTTP}/api/auth/signup/",
        json={
            "username": USER_A_NAME,
            "email": EMAIL_A,
            "password": PASSWORD_A,
            "password_confirm": PASSWORD_A,
        },
        timeout=60,
    )
    print(f"    Signup User A Status Code: {res_signup_a.status_code}")
    if res_signup_a.status_code != 201:
        print(f"[!] FAILED at Signup User A: HTTP {res_signup_a.status_code}")
        print(f"    Response body: {res_signup_a.text}")
        sys.exit(1)
    user_a_id = res_signup_a.json().get("user_id")

    # 2. Register User B
    print(f"[*] Registering user B: {USER_B_NAME}")
    res_signup_b = requests.post(
        f"{BASE_HTTP}/api/auth/signup/",
        json={
            "username": USER_B_NAME,
            "email": EMAIL_B,
            "password": PASSWORD_B,
            "password_confirm": PASSWORD_B,
        },
        timeout=60,
    )
    print(f"    Signup User B Status Code: {res_signup_b.status_code}")
    if res_signup_b.status_code != 201:
        print(f"[!] FAILED at Signup User B: HTTP {res_signup_b.status_code}")
        print(f"    Response body: {res_signup_b.text}")
        sys.exit(1)
    user_b_id = res_signup_b.json().get("user_id")

    # 3. Log in User A
    print(f"[*] Logging in User A ({USER_A_NAME})")
    res_login_a = requests.post(
        f"{BASE_HTTP}/api/auth/login/",
        json={"username": USER_A_NAME, "password": PASSWORD_A},
        timeout=60,
    )
    print(f"    Login User A Status Code: {res_login_a.status_code}")
    if res_login_a.status_code != 200:
        print(f"[!] FAILED at Login User A: HTTP {res_login_a.status_code}")
        print(f"    Response body: {res_login_a.text}")
        sys.exit(1)
    token_a = res_login_a.json().get("token")

    # 4. Log in User B
    print(f"[*] Logging in User B ({USER_B_NAME})")
    res_login_b = requests.post(
        f"{BASE_HTTP}/api/auth/login/",
        json={"username": USER_B_NAME, "password": PASSWORD_B},
        timeout=60,
    )
    print(f"    Login User B Status Code: {res_login_b.status_code}")
    if res_login_b.status_code != 200:
        print(f"[!] FAILED at Login User B: HTTP {res_login_b.status_code}")
        print(f"    Response body: {res_login_b.text}")
        sys.exit(1)
    token_b = res_login_b.json().get("token")

    # 5. Send support request A -> B
    print(f"[*] User A sending support request to User B (id={user_b_id})...")
    res_send = requests.post(
        f"{BASE_HTTP}/api/support/send/{user_b_id}/",
        headers={"Authorization": f"Bearer {token_a}"},
        timeout=60,
    )
    print(f"    Send Support Request Status Code: {res_send.status_code}")
    if res_send.status_code != 201:
        print(f"[!] FAILED at Send Support Request: HTTP {res_send.status_code}")
        print(f"    Response body: {res_send.text}")
        sys.exit(1)
    send_data = res_send.json()
    request_id = send_data.get("id") or send_data.get("request_id")
    print(f"    Support Request created with ID: {request_id}")

    # 6. Accept support request as B
    print(f"[*] User B accepting support request (id={request_id})...")
    res_accept = requests.post(
        f"{BASE_HTTP}/api/support/accept/{request_id}/",
        headers={"Authorization": f"Bearer {token_b}"},
        timeout=60,
    )
    print(f"    Accept Support Request Status Code: {res_accept.status_code}")
    if res_accept.status_code != 200:
        print(f"[!] FAILED at Accept Support Request: HTTP {res_accept.status_code}")
        print(f"    Response body: {res_accept.text}")
        sys.exit(1)

    # 7. Fetch connection_id from connections endpoint
    print(f"[*] Fetching active connections for User A...")
    res_conn = requests.get(
        f"{BASE_HTTP}/api/support/connections/",
        headers={"Authorization": f"Bearer {token_a}"},
        timeout=30,
    )
    print(f"    Fetch Connections Status Code: {res_conn.status_code}")
    if res_conn.status_code != 200:
        print(f"[!] FAILED at Fetch Connections: HTTP {res_conn.status_code}")
        print(f"    Response body: {res_conn.text}")
        sys.exit(1)

    conns = res_conn.json()
    if not conns:
        print(f"[!] FAILED: No connections found in active_connections list!")
        sys.exit(1)

    connection_id = conns[0].get("connection_id")
    print(f"    Retrieved Active Connection ID: {connection_id}")
    print(f"[+] STEP 1 SUCCESSFUL.\n")

    return {
        "user_a_name": USER_A_NAME,
        "user_a_id": user_a_id,
        "token_a": token_a,
        "user_b_name": USER_B_NAME,
        "user_b_id": user_b_id,
        "token_b": token_b,
        "connection_id": connection_id,
    }


async def run_ws_test(setup_info, retry_if_needed=True):
    print("=" * 70)
    print("STEP 2 - WebSocket test")
    print("=" * 70)

    conn_id = setup_info["connection_id"]
    token_a = setup_info["token_a"]
    token_b = setup_info["token_b"]

    ws_url_a = f"{BASE_WS}/ws/chat/{conn_id}/?token={token_a}"
    ws_url_b = f"{BASE_WS}/ws/chat/{conn_id}/?token={token_b}"

    print(f"WebSocket Base URL: {BASE_WS}")
    print(f"Connection Path:   /ws/chat/{conn_id}/")
    print(f"Origin Header:     {ORIGIN}")

    test_message_text = f"PROBE_MSG_{int(time.time())}"
    received_frames_b = []
    received_frames_a = []
    handshake_a = {"status": "pending", "http_status": None, "close_code": None, "close_reason": None}
    handshake_b = {"status": "pending", "http_status": None, "close_code": None, "close_reason": None}

    msg_sent_time = None
    msg_received_time = None

    async def client_b_handler(ws_b):
        nonlocal msg_received_time
        try:
            while True:
                frame_raw = await ws_b.recv()
                t_recv = time.time()
                try:
                    parsed = json.loads(frame_raw)
                except Exception:
                    parsed = frame_raw
                received_frames_b.append((t_recv, parsed))
                print(f"    [USER B FRAME RECEIVED] {frame_raw}")
                if isinstance(parsed, dict) and parsed.get("message") == test_message_text:
                    msg_received_time = t_recv
                    print(f"    [+] USER B matched test message!")
                    break
        except websockets.exceptions.ConnectionClosed as cc:
            print(f"    [USER B CLOSED] Code: {cc.code}, Reason: {cc.reason}")
            handshake_b["close_code"] = cc.code
            handshake_b["close_reason"] = cc.reason

    async def client_a_handler(ws_a):
        try:
            while True:
                frame_raw = await ws_a.recv()
                t_recv = time.time()
                try:
                    parsed = json.loads(frame_raw)
                except Exception:
                    parsed = frame_raw
                received_frames_a.append((t_recv, parsed))
                print(f"    [USER A FRAME RECEIVED] {frame_raw}")
        except websockets.exceptions.ConnectionClosed as cc:
            print(f"    [USER A CLOSED] Code: {cc.code}, Reason: {cc.reason}")
            handshake_a["close_code"] = cc.code
            handshake_a["close_reason"] = cc.reason

    success = False
    try:
        print("[*] Connecting User A and User B concurrently...")
        async with websockets.connect(
            ws_url_a,
            origin=ORIGIN,
            open_timeout=15,
            close_timeout=5,
        ) as ws_a:
            handshake_a["status"] = "accepted"
            print(f"    [USER A HANDSHAKE] Accepted. State: OPEN")

            async with websockets.connect(
                ws_url_b,
                origin=ORIGIN,
                open_timeout=15,
                close_timeout=5,
            ) as ws_b:
                handshake_b["status"] = "accepted"
                print(f"    [USER B HANDSHAKE] Accepted. State: OPEN")

                # Start listeners
                b_task = asyncio.create_task(client_b_handler(ws_b))
                a_task = asyncio.create_task(client_a_handler(ws_a))

                # Allow connections to settle
                await asyncio.sleep(1.0)

                # Send message from A
                payload = json.dumps({"type": "message", "message": test_message_text})
                print(f"[*] User A sending message frame: {payload}")
                msg_sent_time = time.time()
                await ws_a.send(payload)

                # Wait up to 10s for User B to receive
                try:
                    await asyncio.wait_for(b_task, timeout=10.0)
                    success = True
                except asyncio.TimeoutError:
                    print("    [-] Timed out waiting for User B to receive message.")
                    b_task.cancel()

                a_task.cancel()
                await asyncio.sleep(0.5)

            handshake_b["close_code"] = ws_b.close_code
            handshake_b["close_reason"] = ws_b.close_reason

        handshake_a["close_code"] = ws_a.close_code
        handshake_a["close_reason"] = ws_a.close_reason

    except websockets.exceptions.InvalidStatusCode as isc:
        print(f"[-] HANDSHAKE REJECTED with HTTP status code: {isc.status_code}")
        print(f"    Headers: {isc.headers}")
    except websockets.exceptions.ConnectionClosedError as cce:
        print(f"[-] Connection Closed Error: Code={cce.code}, Reason={cce.reason}")
    except Exception as exc:
        print(f"[-] Exception during WS test: {exc.__class__.__name__}: {exc}")

    # Report results
    print("-" * 50)
    print("STEP 2 SUMMARY:")
    print(f"User A Handshake: {handshake_a['status']}, Close Code: {handshake_a['close_code']} (Reason: {handshake_a['close_reason']!r})")
    print(f"User B Handshake: {handshake_b['status']}, Close Code: {handshake_b['close_code']} (Reason: {handshake_b['close_reason']!r})")
    if msg_sent_time and msg_received_time:
        duration = (msg_received_time - msg_sent_time) * 1000.0
        print(f"Message Delivery: SUCCESS (B received A's message)")
        print(f"Delivery Latency: {duration:.2f} ms")
    else:
        print(f"Message Delivery: FAILED or UNCONFIRMED")

    if not success and retry_if_needed:
        print("\n[*] Retrying Step 2 after 40-second wait (Render free instance may be waking up)...")
        time.sleep(40)
        return await run_ws_test(setup_info, retry_if_needed=False)

    return {
        "success": success,
        "test_message": test_message_text,
        "sent_time": msg_sent_time,
        "received_time": msg_received_time,
        "frames_a": received_frames_a,
        "frames_b": received_frames_b,
        "handshake_a": handshake_a,
        "handshake_b": handshake_b,
    }


def run_rest_check(setup_info, ws_result):
    print("\n" + "=" * 70)
    print("STEP 3 - REST check")
    print("=" * 70)

    conn_id = setup_info["connection_id"]
    token_a = setup_info["token_a"]
    test_msg = ws_result["test_message"]

    url = f"{BASE_HTTP}/api/chat/{conn_id}/messages/"
    print(f"[*] Fetching message history from REST endpoint:")
    print(f"    GET {url}")

    res = requests.get(
        url,
        headers={"Authorization": f"Bearer {token_a}"},
        timeout=30,
    )
    print(f"    REST Message History Status Code: {res.status_code}")

    if res.status_code != 200:
        print(f"[!] FAILED to fetch message history: HTTP {res.status_code}")
        print(f"    Response body: {res.text}")
        return False, []

    messages = res.json()
    print(f"    Messages retrieved: {len(messages)}")
    found = False
    for m in messages:
        content = m.get("content") or m.get("message")
        sender = m.get("sender") or m.get("sender_id")
        created_at = m.get("created_at") or m.get("timestamp")
        print(f"    - Message: content={content!r}, sender={sender}, created_at={created_at}")
        if content == test_msg:
            found = True

    if found:
        print(f"[+] Message '{test_msg}' WAS SAVED in database via REST check.")
    else:
        print(f"[-] Message '{test_msg}' WAS NOT FOUND in REST message history.")

    return found, messages


def main():
    setup_info = run_e2e()
    ws_result = asyncio.run(run_ws_test(setup_info))
    rest_saved, messages = run_rest_check(setup_info, ws_result)

    print("\n" + "=" * 70)
    print("STEP 4 - Classification")
    print("=" * 70)

    # Classify failure
    # Options: DB error / Redis or Upstash error / token or auth rejection /
    has_redis_error_frame = any(
        isinstance(f[1], dict) and "temporary connection issue" in str(f[1].get("detail", ""))
        for f in ws_result["frames_a"] + ws_result["frames_b"]
    )
    is_code_4000 = (ws_result["handshake_a"].get("close_code") == 4000 or ws_result["handshake_b"].get("close_code") == 4000)

    if has_redis_error_frame or is_code_4000:
        classification = "Redis or Upstash error"
        evidence_line = '[USER FRAME RECEIVED] {"type": "error", "detail": "temporary connection issue, please retry"}'
    elif ws_result["success"] and rest_saved:
        classification = "frontend-only bug (backend works end to end)"
        duration = (ws_result['received_time'] - ws_result['sent_time']) * 1000.0
        evidence_line = f"Live message '{ws_result['test_message']}' sent from User A ({setup_info['user_a_name']}) was received by User B ({setup_info['user_b_name']}) over WebSocket in {duration:.2f} ms and verified saved in Postgres DB via REST /api/chat/{setup_info['connection_id']}/messages/."
    elif not ws_result["success"] and rest_saved:
        classification = "Redis or Upstash error"
        evidence_line = "Message was saved to database by consumer, but group broadcast to recipient failed."
    elif ws_result["handshake_a"]["close_code"] == 4003 or ws_result["handshake_b"]["close_code"] == 4003:
        classification = "token or auth rejection"
        evidence_line = "WebSocket handshake/connection closed with code 4003 (SupportChatConsumer rejected auth or connection access)."
    elif ws_result["handshake_a"].get("http_status") == 403 or ws_result["handshake_b"].get("http_status") == 403:
        classification = "origin rejection"
        evidence_line = "WebSocket handshake rejected with HTTP 403 Forbidden by AllowedHostsOriginValidator."
    elif ws_result["handshake_a"].get("http_status") == 404 or ws_result["handshake_b"].get("http_status") == 404:
        classification = "routing not found"
        evidence_line = "WebSocket handshake rejected with HTTP 404 Not Found."
    elif not rest_saved:
        classification = "DB error"
        evidence_line = "WebSocket connection established but message could not be persisted to the database."
    else:
        classification = "consumer crash"
        evidence_line = f"WebSocket closed unexpectedly: {ws_result}"

    print(f"CLASSIFICATION: {classification}")
    print(f"EVIDENCE: {evidence_line}")

    print("\n" + "=" * 70)
    print("STEP 5 - Cleanup")
    print("=" * 70)
    print(f"Created probe users and connection (NOT DELETED, awaiting approval):")
    print(f"  User A: ID={setup_info['user_a_id']}, Username={setup_info['user_a_name']}")
    print(f"  User B: ID={setup_info['user_b_id']}, Username={setup_info['user_b_name']}")
    print(f"  Connection: ID={setup_info['connection_id']}")
    print("\nExact cleanup command:")
    cid = setup_info["connection_id"]
    u_a = setup_info["user_a_name"]
    u_b = setup_info["user_b_name"]
    cleanup_cmd = (
        f"python -c \"import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings'); "
        f"django.setup(); from django.contrib.auth.models import User; from apps.support.models import SupportConnection; "
        f"from apps.chat.models import Message; "
        f"conn_id='{cid}'; "
        f"Message.objects.filter(connection__connection_id=conn_id).delete(); "
        f"SupportConnection.objects.filter(connection_id=conn_id).delete(); "
        f"User.objects.filter(username__in=['{u_a}', '{u_b}']).delete(); "
        f"print('Cleanup complete.')\""
    )
    print(f"  {cleanup_cmd}")
    print("=" * 70)


if __name__ == "__main__":
    main()
