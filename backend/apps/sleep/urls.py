from django.urls import path
from . import views

urlpatterns = [
    path('', views.sleep_list_create, name='sleep_list_create'),
    path('today/', views.sleep_today, name='sleep_today'),
    path('stats/', views.sleep_stats, name='sleep_stats'),
    path('<int:sleep_id>/', views.sleep_detail, name='sleep_detail'),
]
