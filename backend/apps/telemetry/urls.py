from django.urls import path
from . import views

urlpatterns = [
    path('crash/', views.crash_report_view, name='telemetry_crash'),
    path('event/', views.analytics_event_view, name='telemetry_event'),
    path('log/', views.client_log_view, name='telemetry_log'),
]
