#!/usr/bin/env python3
"""
WebSocket Diagnostic Probe (ws_probe.py)
Connects to production WebSocket endpoint, performs handshake with provided JWT token,
sends a test message frame, and logs handshake status, received frames, and close codes.

Usage:
    export PROBE_TOKEN="<your_jwt_access_token>"
    export PROBE_CONN_ID="<active_connection_uuid>"
    python scripts/ws_probe.py

Options (via environment variables or flags):
    PROBE_TOKEN: JWT access token (Required)
    PROBE_HOST: WebSocket host (Default: wss://aidepressionproject.onrender.com)
    PROBE_CONN_ID: Connection UUID (Default: 00000000-0000-0000-0000-000000000000)
    PROBE_ORIGIN: Origin header (Default: https://soul-care-one.vercel.app)
"""

import os
import sys
import asyncio
import json
import argparse
import re

try:
    import websockets
except ImportError:
    print("[ERROR] 'websockets' library is required. Install with: pip install websockets")
    sys.exit(1)


def sanitize(text: str) -> str:
    """Mask credentials, tokens, and secrets."""
    if not text:
        return ""
    # Mask JWT tokens (header.payload.signature)
    text = re.sub(r'eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+', 'ey***.***.***', text)
    # Mask token parameter in URLs
    text = re.sub(r'([?&]token=)[^&]+', r'\1*****', text)
    return text


async def probe_websocket(host: str, conn_id: str, token: str, origin: str, timeout: float = 10.0):
    ws_url = f"{host.rstrip('/')}/ws/chat/{conn_id}/?token={token}"
    sanitized_url = sanitize(ws_url)

    print("=" * 70)
    print("WEBSOCKET CONNECTION PROBE")
    print("=" * 70)
    print(f"Target URL:    {sanitized_url}")
    print(f"Origin Header: {origin}")
    print(f"Connection ID: {conn_id}")
    print(f"Token:         {token[:6]}...{token[-4:] if len(token) > 10 else '***'} (Length: {len(token)})")
    print("-" * 70)

    # Prepare extra headers (Origin header is critical for AllowedHostsOriginValidator)
    additional_headers = {}
    if origin:
        additional_headers["Origin"] = origin

    try:
        print("[*] Initiating WebSocket handshake...")
        # websockets v14+ supports additional_headers / extra_headers
        connect_kwargs = {
            "close_timeout": 5,
            "open_timeout": timeout,
        }
        
        # Check websockets argument compatibility
        import inspect
        sig = inspect.signature(websockets.connect)
        if "additional_headers" in sig.parameters:
            connect_kwargs["additional_headers"] = additional_headers
        elif "extra_headers" in sig.parameters:
            connect_kwargs["extra_headers"] = additional_headers

        async with websockets.connect(ws_url, **connect_kwargs) as ws:
            print("[+] HANDSHAKE SUCCESS: WebSocket connection opened and accepted!")
            print(f"    Protocol: {ws.subprotocol or 'None'}")
            print(f"    State:    OPEN (readyState={getattr(ws, 'state', 'OPEN')})")

            # Send test message frame
            test_frame = json.dumps({
                "type": "message",
                "message": "PROBE_PING_TEST"
            })
            print(f"[*] Sending test message frame: {test_frame}")
            await ws.send(test_frame)

            print(f"[*] Listening for incoming frames (listening for {timeout}s)...")
            start_time = asyncio.get_event_loop().time()
            try:
                while True:
                    remaining = timeout - (asyncio.get_event_loop().time() - start_time)
                    if remaining <= 0:
                        print("[*] Listening window completed.")
                        break

                    try:
                        frame = await asyncio.wait_for(ws.recv(), timeout=min(remaining, 3.0))
                        print(f"    [FRAME RECEIVED] {frame}")
                    except asyncio.TimeoutError:
                        continue
            except websockets.exceptions.ConnectionClosed as cc:
                print(f"[!] WebSocket closed while listening:")
                print(f"    Close Code:   {cc.code}")
                print(f"    Close Reason: {cc.reason or '(empty)'}")
                return

            # Initiate graceful close
            print("[*] Closing probe connection cleanly...")
            await ws.close(code=1000, reason="Probe test finished")
            print(f"[+] Final Socket Status: Closed cleanly (Code={ws.close_code}, Reason={ws.close_reason})")

    except websockets.exceptions.InvalidStatusCode as isc:
        print(f"[-] HANDSHAKE REJECTED by server with HTTP status code: {isc.status_code}")
        print(f"    Headers: {isc.headers}")
        if isc.status_code == 403:
            print("    --> Note: HTTP 403 often indicates AllowedHostsOriginValidator rejected the Origin header!")
    except websockets.exceptions.InvalidURI as iu:
        print(f"[-] Invalid WebSocket URL: {sanitize(str(iu))}")
    except websockets.exceptions.ConnectionClosedError as cce:
        print(f"[-] Server closed connection abruptly during handshake/connection:")
        print(f"    Close Code:   {cce.code}")
        print(f"    Close Reason: {cce.reason or '(empty)'}")
        if cce.code == 4003:
            print("    --> Note: Code 4003 indicates SupportChatConsumer rejected auth or connection access!")
    except Exception as exc:
        print(f"[-] Probe encountered error: {exc.__class__.__name__}: {sanitize(str(exc))}")

    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="WebSocket Probe for SoulCare Production")
    parser.add_argument("--token", default=os.environ.get("PROBE_TOKEN", ""), help="JWT Access Token")
    parser.add_argument("--host", default=os.environ.get("PROBE_HOST", "wss://aidepressionproject.onrender.com"), help="WebSocket Host URL")
    parser.add_argument("--conn", default=os.environ.get("PROBE_CONN_ID", "00000000-0000-0000-0000-000000000000"), help="Connection UUID")
    parser.add_argument("--origin", default=os.environ.get("PROBE_ORIGIN", "https://soul-care-one.vercel.app"), help="Origin header")
    parser.add_argument("--timeout", type=float, default=10.0, help="Timeout in seconds")
    args = parser.parse_args()

    token = args.token.strip()
    if not token:
        print("[ERROR] JWT access token is required.")
        print("Please provide it via --token <JWT> or export PROBE_TOKEN='<JWT>'")
        sys.exit(1)

    asyncio.run(probe_websocket(
        host=args.host.strip(),
        conn_id=args.conn.strip(),
        token=token,
        origin=args.origin.strip(),
        timeout=args.timeout,
    ))


if __name__ == "__main__":
    main()
