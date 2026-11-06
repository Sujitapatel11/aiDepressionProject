from django.urls import path

from . import views

urlpatterns = [
    path('rooms/', views.room_list, name='soultube_room_list'),
    path('rooms/create/', views.room_create, name='soultube_room_create'),
    path('rooms/<str:code>/', views.room_detail, name='soultube_room_detail'),
    path('rooms/<str:code>/join/', views.room_join, name='soultube_room_join'),
    path('rooms/<str:code>/leave/', views.room_leave, name='soultube_room_leave'),
    path('rooms/<str:code>/close/', views.room_close, name='soultube_room_close'),
    path('rooms/<str:code>/messages/', views.room_messages, name='soultube_room_messages'),
    path('rooms/<str:code>/queue/', views.room_queue_add, name='soultube_room_queue_add'),
    path('rooms/<str:code>/queue/reorder/', views.room_queue_reorder, name='soultube_room_queue_reorder'),
    path('rooms/<str:code>/queue/<int:item_id>/', views.room_queue_remove, name='soultube_room_queue_remove'),
    path('rooms/<str:code>/queue/<int:item_id>/play/', views.room_queue_play, name='soultube_room_queue_play'),
    path('rooms/<str:code>/playback/', views.room_playback, name='soultube_room_playback'),
]
