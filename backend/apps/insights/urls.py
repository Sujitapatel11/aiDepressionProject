from django.urls import path
from . import views

urlpatterns = [
    path('', views.insight_list, name='insight_list'),
    path('dismiss/<int:insight_id>/', views.dismiss_insight, name='dismiss_insight'),
    path('generate/<int:journal_id>/', views.generate_for_journal, name='generate_for_journal'),
]
