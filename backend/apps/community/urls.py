from django.urls import path
from . import views

urlpatterns = [
    path("posts/", views.list_posts, name="community-list-posts"),
    path("posts/create/", views.create_post, name="community-create-post"),
    path("posts/<uuid:post_id>/report/", views.report_post, name="community-report-post"),
    path("posts/<uuid:post_id>/react/", views.react_to_post, name="community-react-post"),
]
