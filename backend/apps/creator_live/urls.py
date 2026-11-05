from django.urls import path

from . import views

urlpatterns = [
    path('sessions/', views.session_list, name='live_session_list'),
    path('sessions/create/', views.session_create, name='live_session_create'),
    path('sessions/<uuid:session_id>/', views.session_detail, name='live_session_detail'),
    path('sessions/<uuid:session_id>/start/', views.session_start, name='live_session_start'),
    path('sessions/<uuid:session_id>/end/', views.session_end, name='live_session_end'),
    path('sessions/<uuid:session_id>/token/', views.session_token, name='live_session_token'),
]
