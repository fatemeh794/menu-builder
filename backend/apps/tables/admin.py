from django.contrib import admin

from apps.tables.models import Table


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ("label", "restaurant", "is_active", "created_at")
    list_filter = ("restaurant", "is_active")
    search_fields = ("label",)
    readonly_fields = ("secure_token",)
