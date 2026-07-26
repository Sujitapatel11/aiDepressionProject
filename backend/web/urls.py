from django.urls import path, re_path
from . import views

# All non-API routes serve the SPA shell — JS handles routing client-side
urlpatterns = [
    path('login/', views.login_view, name='login'),
    re_path(r'^(?!api/|admin/|ws/).*$', views.index, name='index'),
]

