from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # REST API
    path('api/auth/', include('apps.authentication.urls')),
    path('api/journal/', include('apps.journal.urls')),
    path('api/insights/', include('apps.insights.urls')),
    path('api/support/', include('apps.support.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/dashboard/', include('apps.support.dashboard_urls')),

    # Password reset confirmation (email link)
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
