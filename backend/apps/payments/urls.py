from django.urls import path

from apps.payments.views import PaymentCallbackView, PaymentCreateView

urlpatterns = [
    path("payments/<str:token>/create/", PaymentCreateView.as_view(), name="payment-create"),
    path("payments/callback/", PaymentCallbackView.as_view(), name="payment-callback"),
]
