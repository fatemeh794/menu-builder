from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, viewsets

from apps.core.mixins import TenantScopedViewSet
from apps.menu.models import Category, MenuItem, MenuItemOptionGroup
from apps.menu.serializers import (
    CategoryPublicSerializer,
    CategoryWriteSerializer,
    MenuItemOptionGroupWriteSerializer,
    MenuItemPublicSerializer,
    MenuItemWriteSerializer,
)
from apps.restaurants.models import Restaurant

# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------


def _get_active_restaurant(restaurant_slug):
    return get_object_or_404(Restaurant, slug=restaurant_slug, is_active=True)


class CategoryPublicListView(generics.ListAPIView):
    serializer_class = CategoryPublicSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        restaurant = _get_active_restaurant(self.kwargs["restaurant_slug"])
        return Category.objects.filter(restaurant=restaurant, is_active=True)


class MenuItemPublicListView(generics.ListAPIView):
    """GET /api/v1/menu/{slug}/items/?category=<id>&search=<q>"""

    serializer_class = MenuItemPublicSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        restaurant = _get_active_restaurant(self.kwargs["restaurant_slug"])
        qs = MenuItem.objects.filter(restaurant=restaurant, is_active=True).prefetch_related(
            "option_groups__options"
        )
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category_id=category)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


class CategoryViewSet(TenantScopedViewSet, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategoryWriteSerializer


class MenuItemViewSet(TenantScopedViewSet, viewsets.ModelViewSet):
    queryset = MenuItem.objects.select_related("category").prefetch_related(
        "option_groups__options"
    )
    serializer_class = MenuItemWriteSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["restaurant"] = self.request.restaurant
        return context


class MenuItemOptionGroupViewSet(viewsets.ModelViewSet):
    """/api/v1/dashboard/{restaurant_slug}/items/{item_id}/option-groups/"""

    serializer_class = MenuItemOptionGroupWriteSerializer
    permission_classes = MenuItemViewSet.permission_classes

    def _get_menu_item(self):
        return get_object_or_404(
            MenuItem, id=self.kwargs["item_id"], restaurant=self.request.restaurant
        )

    def get_queryset(self):
        return MenuItemOptionGroup.objects.filter(menu_item=self._get_menu_item()).prefetch_related(
            "options"
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["menu_item"] = self._get_menu_item()
        return context
