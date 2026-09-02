from django.urls import include, path

urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.restaurants.urls")),
    path("", include("apps.menu.urls")),
    path("", include("apps.tables.urls")),
    path("", include("apps.orders.urls")),
    path("", include("apps.payments.urls")),
]
