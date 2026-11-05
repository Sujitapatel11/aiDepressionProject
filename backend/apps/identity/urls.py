from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.my_identity_view, name='identity_me'),
    path('public/<int:user_id>/', views.public_identity_view, name='identity_public'),
    path('cosmetics/', views.available_cosmetics_view, name='identity_cosmetics'),
    # Public profiles (additive; does not alter the avatar-identity endpoints above).
    path('profile/', views.my_public_profile_view, name='identity_my_profile'),
    path('profile/<int:user_id>/', views.public_profile_view, name='identity_public_profile'),
]
