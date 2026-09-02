from django.contrib import admin

from apps.restaurants.models import Restaurant, RestaurantMembership


class RestaurantMembershipInline(admin.TabularInline):
    model = RestaurantMembership
    extra = 1


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [RestaurantMembershipInline]


@admin.register(RestaurantMembership)
class RestaurantMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "restaurant", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__username", "user__email", "restaurant__name")
