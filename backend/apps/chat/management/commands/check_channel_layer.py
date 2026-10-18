import asyncio
import re
import uuid
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer


def sanitize_message(msg: str) -> str:
    """Strip passwords and tokens from connection strings and error messages."""
    # Strip URL credentials (e.g. redis://:password@host or rediss://user:password@host)
    msg = re.sub(r'([a-zA-Z0-9+.-]+://[^:]*:)([^@]+)(@)', r'\1*****\3', msg)
    # Strip inline key/value assignments for credentials
    msg = re.sub(
        r'((?:password|secret|token|api_key)\s*[:=]\s*)([\'"][^\'"]*[\'"]|[^\s,;]+)',
        r'\1*****',
        msg,
        flags=re.IGNORECASE,
    )
    return msg


async def run_round_trip(channel_layer, timeout: float = 5.0):
    test_group = f"diagnostics_group_{uuid.uuid4().hex[:8]}"
    test_channel = await channel_layer.new_channel()
    test_nonce = uuid.uuid4().hex
    test_payload = {
        "type": "diagnostic.ping",
        "nonce": test_nonce,
        "message": "channel_layer_roundtrip_test",
    }

    try:
        # Step 1: Add channel to test group
        await channel_layer.group_add(test_group, test_channel)

        # Step 2: Send payload to test group
        await channel_layer.group_send(test_group, test_payload)

        # Step 3: Receive payload from test channel with timeout
        received = await asyncio.wait_for(channel_layer.receive(test_channel), timeout=timeout)

        # Step 4: Validate received payload
        if not received or received.get("nonce") != test_nonce:
            raise ValueError(f"Payload mismatch: expected nonce {test_nonce}, got {received}")

        return received

    finally:
        # Step 5: Clean up group membership
        try:
            await channel_layer.group_discard(test_group, test_channel)
        except Exception:
            pass


class Command(BaseCommand):
    help = "Validates the configured Django Channels channel layer with a real group_add, group_send, and receive round-trip."

    def add_arguments(self, parser):
        parser.add_argument(
            "--timeout",
            type=float,
            default=5.0,
            help="Timeout in seconds for channel_layer.receive (default: 5.0)",
        )

    def handle(self, *args, **options):
        timeout = options["timeout"]
        channel_layer = get_channel_layer()

        if channel_layer is None:
            self.stderr.write(self.style.ERROR("[FAIL] No channel layer configured (CHANNEL_LAYERS is None)."))
            return

        backend_name = getattr(channel_layer, "__class__", type(channel_layer)).__name__
        self.stdout.write(f"[*] Testing channel layer backend: {backend_name}")

        try:
            received = asyncio.run(run_round_trip(channel_layer, timeout=timeout))
            self.stdout.write(
                self.style.SUCCESS(
                    f"[SUCCESS] Channel layer round-trip succeeded!\n"
                    f"  Backend: {backend_name}\n"
                    f"  Received: {received}"
                )
            )
        except Exception as exc:
            sanitized_err = sanitize_message(str(exc))
            self.stderr.write(
                self.style.ERROR(
                    f"[FAIL] Channel layer round-trip failed!\n"
                    f"  Exception Class: {exc.__class__.__name__}\n"
                    f"  Error Message: {sanitized_err}"
                )
            )
