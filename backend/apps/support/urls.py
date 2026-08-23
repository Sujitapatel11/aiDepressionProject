from django.urls import path
from . import views

urlpatterns = [
    path('users/', views.available_users, name='available_users'),
    path('matches/', views.available_users, name='matches'),
    path('requests/', views.incoming_requests, name='incoming_requests'),
    path('requests/sent/', views.sent_requests, name='sent_requests'),
    path('send/<int:user_id>/', views.send_request, name='send_request'),
    path('accept/<int:request_id>/', views.accept_request, name='accept_request'),
    path('reject/<int:request_id>/', views.reject_request, name='reject_request'),
    path('requests/<int:request_id>/cancel/', views.cancel_request, name='cancel_request'),
    path('connections/', views.active_connections, name='active_connections'),
    path('connections/<str:connection_id>/block/', views.block_connection, name='block_connection'),
    path('connections/<str:connection_id>/disconnect/', views.disconnect_connection, name='disconnect_connection'),
    path('personality/', views.my_personality, name='my_personality'),

    # Connection Activity & Leveling Endpoints
    path('activity/consent/', views.activity_consent, name='activity_consent'),
    path('connections/<str:connection_id>/activity/', views.connection_activity_status, name='connection_activity_status'),
    path('connections/<str:connection_id>/activity/generate/', views.generate_connection_activity, name='generate_connection_activity'),
    path('connections/<str:connection_id>/activity/submit/', views.submit_connection_activity, name='submit_connection_activity'),
]

