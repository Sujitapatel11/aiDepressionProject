from django.urls import re_path

from .consumers import WatchRoomConsumer

websocket_urlpatterns = [
    re_path(r'^/?ws/soultube/(?P<code>[A-Za-z0-9]{4,8})/$', WatchRoomConsumer.as_asgi()),
]
