from django.urls import path
from . import views

urlpatterns = [
    path("profile/", views.creator_profile, name="creator-profile"),
    path("posts/", views.creator_posts, name="creator-posts"),
    path("posts/<uuid:post_id>/", views.creator_post_detail, name="creator-post-detail"),
    path("posts/<uuid:post_id>/publish/", views.publish_creator_post, name="creator-post-publish"),
    path("feed/", views.public_creator_feed, name="creator-public-feed"),
    path("earnings/", views.creator_earnings, name="creator-earnings"),
    path("withdrawals/", views.creator_withdrawals, name="creator-withdrawals"),
    path("settlements/", views.creator_settlements, name="creator-settlements"),
    path("internal/settlements/prepare/", views.prepare_monthly_settlements, name="creator-prepare-settlements"),
    path("internal/settlements/<uuid:settlement_id>/paid/", views.mark_settlement_paid, name="creator-mark-settlement-paid"),
    path("internal/ad-revenue/", views.record_verified_ad_revenue, name="creator-record-ad-revenue"),
    path("internal/withdrawals/<uuid:withdrawal_id>/review/", views.review_creator_withdrawal, name="creator-review-withdrawal"),
]
