from rest_framework import serializers

from apps.orders.models import Order, OrderItem, OrderItemOption

# ---------------------------------------------------------------------------
# Guest order creation (input)
# ---------------------------------------------------------------------------


class OrderItemInputSerializer(serializers.Serializer):
    menu_item_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    option_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)


class OrderCreateSerializer(serializers.Serializer):
    restaurant_slug = serializers.SlugField()
    table_token = serializers.CharField()
    customer_name = serializers.CharField(max_length=100)
    customer_phone = serializers.CharField(max_length=20)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    items = OrderItemInputSerializer(many=True)


# ---------------------------------------------------------------------------
# Order read shapes (tracking + dashboard)
# ---------------------------------------------------------------------------


class OrderItemOptionOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItemOption
        fields = ("option_group_name", "option_name", "extra_price")


class OrderItemOutputSerializer(serializers.ModelSerializer):
    options = OrderItemOptionOutputSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "menu_item_name", "unit_price", "quantity", "line_total", "options")


class OrderTrackSerializer(serializers.ModelSerializer):
    items = OrderItemOutputSerializer(many=True, read_only=True)
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)
    restaurant_slug = serializers.CharField(source="restaurant.slug", read_only=True)
    table_label = serializers.CharField(source="table.label", read_only=True, default=None)
    is_paid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "secure_order_token",
            "restaurant_name",
            "restaurant_slug",
            "table_label",
            "customer_name",
            "customer_phone",
            "note",
            "status",
            "total_amount",
            "is_paid",
            "items",
            "created_at",
        )


class OrderListSerializer(serializers.ModelSerializer):
    table_label = serializers.CharField(source="table.label", read_only=True, default=None)
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "table_label",
            "customer_name",
            "status",
            "total_amount",
            "item_count",
            "created_at",
        )


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ("status",)

    def validate_status(self, new_status):
        if self.instance.status in Order.TERMINAL_STATUSES:
            raise serializers.ValidationError(
                f"Order is already {self.instance.status} and cannot change status."
            )
        return new_status
