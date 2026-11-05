from django.urls import path

from . import views

urlpatterns = [
    path('uploads/', views.upload_media, name='media_upload'),
    path('uploads/<uuid:asset_id>/', views.delete_orphan_media, name='media_upload_delete'),
    path('serve/<uuid:asset_id>/', views.serve_media, name='media_serve'),
    path('usage/', views.storage_usage, name='media_usage'),
]
