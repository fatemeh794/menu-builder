from django.contrib import admin

from apps.payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "amount", "gateway", "status", "ref_id", "created_at")
    list_filter = ("gateway", "status")
    search_fields = ("authority", "ref_id", "order__id")
    readonly_fields = ("authority", "ref_id")
