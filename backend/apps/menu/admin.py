from django.contrib import admin

from apps.menu.models import Category, MenuItem, MenuItemOption, MenuItemOptionGroup


class MenuItemOptionInline(admin.TabularInline):
    model = MenuItemOption
    extra = 1


@admin.register(MenuItemOptionGroup)
class MenuItemOptionGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "menu_item", "selection_type", "is_required")
    list_filter = ("selection_type", "is_required")
    inlines = [MenuItemOptionInline]


class MenuItemOptionGroupInline(admin.TabularInline):
    model = MenuItemOptionGroup
    extra = 0
    show_change_link = True


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ("name", "restaurant", "category", "base_price", "is_available", "is_active")
    list_filter = ("restaurant", "category", "is_available", "is_active")
    search_fields = ("name",)
    inlines = [MenuItemOptionGroupInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "restaurant", "order", "is_active")
    list_filter = ("restaurant", "is_active")
    search_fields = ("name",)
