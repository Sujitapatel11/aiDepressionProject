from django.urls import path
from . import views

urlpatterns = [
    path('', views.journal_list_create, name='journal_list_create'),
    path('transcribe/', views.transcribe_audio_view, name='journal_transcribe'),
    path('<int:journal_id>/', views.journal_detail, name='journal_detail'),
]

