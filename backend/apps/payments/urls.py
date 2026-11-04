from django.urls import path

from . import views

urlpatterns = [
    path("plans/", views.list_plans, name="payment-plans"),
    path("checkout/", views.create_checkout, name="payment-checkout"),
    path("return/esewa/", views.esewa_return, name="payment-esewa-return"),
    path("return/khalti/", views.khalti_return, name="payment-khalti-return"),
]
