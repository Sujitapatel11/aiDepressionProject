from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views

from config.health_view import health_check, db_health_check
from apps.telemetry.views import feedback_view, beta_dashboard_stats

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/db/', db_health_check, name='db_health_check'),
    path('api/health/', health_check, name='health_check'),
    path('health/', health_check, name='health_check_alias'),

    # REST API
    path('api/auth/', include('apps.authentication.urls')),
    path('api/identity/', include('apps.identity.urls')),
    path('api/journal/', include('apps.journal.urls')),
    path('api/insights/', include('apps.insights.urls')),
    path('api/support/', include('apps.support.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/sleep/', include('apps.sleep.urls')),
    path('api/community/', include('apps.community.urls')),
    path('api/creator/', include('apps.creator.urls')),
    path('api/dashboard/', include('apps.support.dashboard_urls')),
    path('api/dashboard/beta/', beta_dashboard_stats, name='beta_dashboard_stats'),
    path('api/telemetry/', include('apps.telemetry.urls')),
    path('api/feedback/', feedback_view, name='feedback_api'),

    # Password reset confirmation (email link)
    path('password/reset/confirm/<uidb64>/<token>/',
         auth_views.PasswordResetConfirmView.as_view(
             success_url='/password-reset-complete/'
         ),
         name='password_reset_confirm_canonical'),
    path('password-reset-confirm/<uidb64>/<token>/',
         auth_views.PasswordResetConfirmView.as_view(
             success_url='/password-reset-complete/'
         ),
         name='password_reset_confirm'),
    path('password-reset-complete/',
         auth_views.PasswordResetCompleteView.as_view(),
         name='password_reset_complete'),

    # Web frontend (Django templates)
    path('', include('web.urls')),
]
