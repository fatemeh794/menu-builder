from rest_framework import serializers

from apps.menu.models import Category, MenuItem, MenuItemOption, MenuItemOptionGroup

# ---------------------------------------------------------------------------
# Public (customer-facing) serializers
# ---------------------------------------------------------------------------


class CategoryPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "image", "order")


class MenuItemOptionPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItemOption
        fields = ("id", "name", "extra_price", "is_default", "is_available")


class MenuItemOptionGroupPublicSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = MenuItemOptionGroup
        fields = (
            "id",
            "name",
            "selection_type",
            "is_required",
            "min_select",
            "max_select",
            "options",
        )

    def get_options(self, obj):
        options = obj.options.all()
        return MenuItemOptionPublicSerializer(options, many=True).data


class MenuItemPublicSerializer(serializers.ModelSerializer):
    """Full item shape (incl. nested option groups) used for both the menu
    grid and the item-detail bottom sheet, so tapping a card opens the
    sheet instantly with no extra round trip."""

    option_groups = MenuItemOptionGroupPublicSerializer(many=True, read_only=True)

    class Meta:
        model = MenuItem
        fields = (
            "id",
            "category",
            "name",
            "description",
            "base_price",
            "image",
            "is_available",
            "option_groups",
        )


# ---------------------------------------------------------------------------
# Dashboard (staff-facing) serializers
# ---------------------------------------------------------------------------


class CategoryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "image", "order", "is_active")
        read_only_fields = ("id",)


class MenuItemOptionWriteSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

    class Meta:
        model = MenuItemOption
        fields = ("id", "name", "extra_price", "is_default", "is_available", "order")


class MenuItemOptionGroupWriteSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    options = MenuItemOptionWriteSerializer(many=True, required=False)

    class Meta:
        model = MenuItemOptionGroup
        fields = (
            "id",
            "name",
            "selection_type",
            "is_required",
            "min_select",
            "max_select",
            "order",
            "options",
        )

    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        menu_item = self.context["menu_item"]
        group = MenuItemOptionGroup.objects.create(menu_item=menu_item, **validated_data)
        for option_data in options_data:
            option_data.pop("id", None)
            MenuItemOption.objects.create(option_group=group, **option_data)
        return group

    def update(self, instance, validated_data):
        options_data = validated_data.pop("options", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if options_data is not None:
            existing_ids = {str(o.id) for o in instance.options.all()}
            sent_ids = set()
            for option_data in options_data:
                option_id = option_data.pop("id", None)
                if option_id and str(option_id) in existing_ids:
                    MenuItemOption.objects.filter(id=option_id).update(**option_data)
                    sent_ids.add(str(option_id))
                else:
                    option = MenuItemOption.objects.create(option_group=instance, **option_data)
                    sent_ids.add(str(option.id))
            instance.options.exclude(id__in=sent_ids).delete()
        return instance


class MenuItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = (
            "id",
            "category",
            "name",
            "description",
            "base_price",
            "image",
            "is_available",
            "is_active",
            "order",
        )
        read_only_fields = ("id",)

    def validate_category(self, category):
        restaurant = self.context["restaurant"]
        if category.restaurant_id != restaurant.id:
            raise serializers.ValidationError("Category does not belong to this restaurant.")
        return category
