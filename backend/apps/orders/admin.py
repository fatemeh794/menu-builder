from django.contrib import admin

from apps.orders.models import Order, OrderItem, OrderItemOption


class OrderItemOptionInline(admin.TabularInline):
    model = OrderItemOption
    extra = 0


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    show_change_link = True


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "restaurant",
        "table",
        "customer_name",
        "status",
        "total_amount",
        "created_at",
    )
    list_filter = ("restaurant", "status")
    search_fields = ("customer_name", "customer_phone", "secure_order_token")
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("menu_item_name", "order", "quantity", "line_total")
    inlines = [OrderItemOptionInline]
