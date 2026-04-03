from django.urls import path
from . import views

urlpatterns = [
    path('<str:connection_id>/messages/', views.message_history, name='message_history'),
]
