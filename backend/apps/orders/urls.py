from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.orders.views import OrderCreateView, OrderTrackView, OrderViewSet

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="dashboard-order")

urlpatterns = [
    path("orders/", OrderCreateView.as_view(), name="order-create"),
    path("orders/track/<str:token>/", OrderTrackView.as_view(), name="order-track"),
    path("dashboard/<slug:restaurant_slug>/", include(router.urls)),
]
