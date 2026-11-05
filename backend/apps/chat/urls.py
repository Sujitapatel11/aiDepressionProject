from django.urls import path
from . import views

urlpatterns = [
    path('ws-ticket/', views.websocket_ticket, name='chat_websocket_ticket'),
    path('<str:connection_id>/messages/', views.message_history, name='message_history'),
]
