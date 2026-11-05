"""Authenticate Django Channels WebSockets with single-use tickets."""
import logging
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

from .models import WebSocketAuthTicket

logger = logging.getLogger(__name__)


@database_sync_to_async
def consume_ticket(ticket):
    return WebSocketAuthTicket.consume(ticket)


def get_ticket_from_scope(scope):
    query_string = scope.get("query_string", b"")
    if not isinstance(query_string, bytes) or len(query_string) > 256:
        return None

    try:
        params = parse_qs(
            query_string.decode("ascii"),
            keep_blank_values=True,
            strict_parsing=True,
        )
    except (UnicodeDecodeError, ValueError):
        return None

    tickets = params.get("ticket", [])
    if set(params) != {"ticket"} or len(tickets) != 1:
        return None
    return tickets[0]


class TicketAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        ticket = get_ticket_from_scope(scope)
        user = None
        if ticket:
            try:
                user = await consume_ticket(ticket)
            except Exception:
                logger.warning("WebSocket ticket authentication failed.")
        scope["user"] = user if user and user.is_active else AnonymousUser()

        return await super().__call__(scope, receive, send)


def TicketAuthMiddlewareStack(inner):
    return TicketAuthMiddleware(inner)
