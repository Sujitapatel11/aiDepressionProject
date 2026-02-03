from django.urls import path
from . import views

urlpatterns = [
    path("", views.login_view, name="login"),
    path("signup/", views.signup_view, name="signup"),
    path("logout/", views.logout_view, name="logout"),
    path("dashboard/", views.dashboard_view, name="dashboard"),
    path("insights/", views.insights_view, name="insights"),
    path("insights/dismiss/<int:insight_id>/", views.insight_detail_view, name="insight_detail"),

    path("support/send/<int:user_id>/", views.send_support_request, name="send_support"),
    path("support/accept/<int:request_id>/", views.accept_support_request, name="accept_support"),
    path("support/reject/<int:request_id>/", views.reject_support_request, name="reject_support"),

    path("chat/<int:user_id>/", views.chat_view, name="chat"),
    path("journal/new/",views.journal_create_view, name="journal_create"),
    path("journal/",views.journal_list_view, name="journal_list"),
    path("journal/delete/<int:journal_id>/", views.journal_delete_view, name="journal_delete"),
]