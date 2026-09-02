from django.db import transaction

from apps.menu.models import MenuItem
from apps.orders.models import Order, OrderItem, OrderItemOption


class OrderValidationError(Exception):
    """Raised for any guest-order input that can't be turned into a
    priced order (bad item, bad option, quantity out of range, ...).
    Carries a dict shaped like DRF field errors."""

    def __init__(self, errors):
        self.errors = errors
        super().__init__(str(errors))


def _resolve_selected_options(menu_item, option_ids):
    """Validate the option_ids against the item's option groups and
    return the MenuItemOption rows to charge for. This is the one place
    that decides whether a customer's customization is legal."""
    option_ids = {str(option_id) for option_id in (option_ids or [])}
    all_options = {
        str(o.id): o for group in menu_item.option_groups.all() for o in group.options.all()
    }

    unknown = option_ids - set(all_options.keys())
    if unknown:
        raise OrderValidationError({"option_ids": f"Unknown option id(s): {sorted(unknown)}"})

    selected_by_group = {}
    for option_id in option_ids:
        option = all_options[option_id]
        if not option.is_available:
            raise OrderValidationError({"option_ids": f'"{option.name}" is not available.'})
        selected_by_group.setdefault(option.option_group_id, []).append(option)

    for group in menu_item.option_groups.all():
        selected = selected_by_group.get(group.id, [])
        if group.is_required and not selected:
            raise OrderValidationError({"option_ids": f'"{group.name}" requires a selection.'})
        if group.selection_type == group.SelectionType.SINGLE and len(selected) > 1:
            raise OrderValidationError(
                {"option_ids": f'"{group.name}" only allows a single choice.'}
            )
        if group.selection_type == group.SelectionType.MULTIPLE:
            if len(selected) < group.min_select:
                raise OrderValidationError(
                    {"option_ids": f'"{group.name}" requires at least {group.min_select}.'}
                )
            if group.max_select is not None and len(selected) > group.max_select:
                raise OrderValidationError(
                    {"option_ids": f'"{group.name}" allows at most {group.max_select}.'}
                )

    return [option for options in selected_by_group.values() for option in options]


@transaction.atomic
def create_guest_order(*, restaurant, table, customer_name, customer_phone, note, items_data):
    """Server-authoritative order creation: every price comes from the DB,
    never from the client payload, so a tampered request can't change
    what gets charged."""
    if not items_data:
        raise OrderValidationError({"items": "Order must contain at least one item."})

    order = Order.objects.create(
        restaurant=restaurant,
        table=table,
        customer_name=customer_name,
        customer_phone=customer_phone,
        note=note or "",
    )

    total_amount = 0
    for index, item_data in enumerate(items_data):
        try:
            menu_item = MenuItem.objects.prefetch_related("option_groups__options").get(
                id=item_data["menu_item_id"], restaurant=restaurant, is_active=True
            )
        except MenuItem.DoesNotExist as exc:
            raise OrderValidationError({"items": f"Item {index}: menu item not found."}) from exc

        if not menu_item.is_available:
            raise OrderValidationError(
                {"items": f'Item {index}: "{menu_item.name}" is currently unavailable.'}
            )

        quantity = item_data.get("quantity", 1)
        if quantity < 1:
            raise OrderValidationError({"items": f"Item {index}: quantity must be at least 1."})

        selected_options = _resolve_selected_options(menu_item, item_data.get("option_ids"))
        options_total = sum(o.extra_price for o in selected_options)
        line_total = (menu_item.base_price + options_total) * quantity

        order_item = OrderItem.objects.create(
            order=order,
            menu_item=menu_item,
            menu_item_name=menu_item.name,
            unit_price=menu_item.base_price,
            quantity=quantity,
            line_total=line_total,
        )
        OrderItemOption.objects.bulk_create(
            [
                OrderItemOption(
                    order_item=order_item,
                    option_group_name=option.option_group.name,
                    option_name=option.name,
                    extra_price=option.extra_price,
                )
                for option in selected_options
            ]
        )
        total_amount += line_total

    order.total_amount = total_amount
    order.save(update_fields=["total_amount"])
    return order


def recompute_order_total(order: Order) -> int:
    """Single source of truth for what an order is worth, re-derived from
    its stored line items. Payment creation always calls this instead of
    trusting order.total_amount from an earlier read."""
    return sum(item.line_total for item in order.items.all())
