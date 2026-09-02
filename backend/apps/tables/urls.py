from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.tables.views import TablePublicDetailView, TableViewSet

router = DefaultRouter()
router.register("tables", TableViewSet, basename="dashboard-table")

urlpatterns = [
    path(
        "tables/<slug:restaurant_slug>/<str:token>/",
        TablePublicDetailView.as_view(),
        name="table-public-detail",
    ),
    path("dashboard/<slug:restaurant_slug>/", include(router.urls)),
]
