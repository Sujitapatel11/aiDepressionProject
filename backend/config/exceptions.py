import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        view = context.get('view') if context else None
        request = context.get('request') if context else None
        method = getattr(request, 'method', '') if request else ''
        path = getattr(request, 'path', '') if request else ''
        view_name = view.__class__.__name__ if view else 'unknown_view'

        logger.exception(
            f"Unhandled exception during {method} {path} (view={view_name}): {exc}",
            exc_info=True,
        )
        return Response(
            {"detail": "Internal server error."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response

