from django.conf import settings
from rest_framework import serializers

from apps.tables.models import Table


class TablePublicSerializer(serializers.ModelSerializer):
    restaurant_slug = serializers.CharField(source="restaurant.slug", read_only=True)
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)

    class Meta:
        model = Table
        fields = ("id", "label", "restaurant_slug", "restaurant_name")


class TableWriteSerializer(serializers.ModelSerializer):
    customer_url = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = ("id", "label", "secure_token", "is_active", "customer_url")
        read_only_fields = ("id", "secure_token")

    def get_customer_url(self, obj):
        return f"{settings.FRONTEND_BASE_URL}/menu/{obj.restaurant.slug}/table/{obj.secure_token}"
