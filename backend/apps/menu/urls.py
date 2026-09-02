from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.menu.views import (
    CategoryPublicListView,
    CategoryViewSet,
    MenuItemOptionGroupViewSet,
    MenuItemPublicListView,
    MenuItemViewSet,
)

dashboard_router = DefaultRouter()
dashboard_router.register("categories", CategoryViewSet, basename="dashboard-category")
dashboard_router.register("items", MenuItemViewSet, basename="dashboard-menu-item")

option_group_router = DefaultRouter()
option_group_router.register(
    "option-groups", MenuItemOptionGroupViewSet, basename="dashboard-option-group"
)

urlpatterns = [
    path(
        "menu/<slug:restaurant_slug>/categories/",
        CategoryPublicListView.as_view(),
        name="public-categories",
    ),
    path(
        "menu/<slug:restaurant_slug>/items/",
        MenuItemPublicListView.as_view(),
        name="public-menu-items",
    ),
    path("dashboard/<slug:restaurant_slug>/", include(dashboard_router.urls)),
    path(
        "dashboard/<slug:restaurant_slug>/items/<uuid:item_id>/",
        include(option_group_router.urls),
    ),
]
