from django.urls import re_path
from .consumers import SupportChatConsumer

websocket_urlpatterns = [
    re_path(r"^/?ws/chat/(?P<connection_id>[0-9a-f-]+)/$", SupportChatConsumer.as_asgi()),
]