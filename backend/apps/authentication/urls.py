from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('signup/', views.signup_view, name='auth_signup'),
    path('login/', views.login_view, name='auth_login'),
    path('logout/', views.logout_view, name='auth_logout'),
    path('google/', views.google_auth_view, name='auth_google'),
    path('password/reset/', views.password_reset_view, name='auth_password_reset'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
