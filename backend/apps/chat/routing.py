from django.urls import re_path
from .consumers import SupportChatConsumer

re_path(r"^/?ws/chat/(?P<connection_id>[0-9a-f-]+)/$", SupportChatConsumer.as_asgi()),
