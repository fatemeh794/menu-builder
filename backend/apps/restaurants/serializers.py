from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.restaurants.models import Restaurant, RestaurantMembership

User = get_user_model()


class RestaurantPublicSerializer(serializers.ModelSerializer):
    """What a guest customer sees: identity + theme, nothing operational."""

    class Meta:
        model = Restaurant
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "logo",
            "cover_image",
            "theme_primary_color",
            "theme_secondary_color",
            "theme_background_color",
            "theme_border_radius",
        )


class RestaurantSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "logo",
            "cover_image",
            "theme_primary_color",
            "theme_secondary_color",
            "theme_background_color",
            "theme_border_radius",
            "is_active",
        )
        read_only_fields = ("id", "slug")


class StaffUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")


class RestaurantMembershipSerializer(serializers.ModelSerializer):
    user = StaffUserSerializer(read_only=True)

    class Meta:
        model = RestaurantMembership
        fields = ("id", "user", "role", "created_at")
        read_only_fields = ("id", "created_at")


class StaffCreateSerializer(serializers.Serializer):
    """Owner/manager onboarding a staff member: attach to an existing user
    (matched by email) or create a new account for them."""

    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=RestaurantMembership.Role.choices)

    def validate(self, attrs):
        if not User.objects.filter(email=attrs["email"]).exists() and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": "Required when creating a new staff account."}
            )
        return attrs

    def create(self, validated_data):
        restaurant = self.context["restaurant"]
        email = validated_data["email"]
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": validated_data.get("first_name", ""),
                "last_name": validated_data.get("last_name", ""),
            },
        )
        if created:
            user.set_password(validated_data["password"])
            user.save(update_fields=["password"])

        membership, _ = RestaurantMembership.objects.update_or_create(
            user=user,
            restaurant=restaurant,
            defaults={"role": validated_data["role"]},
        )
        return membership


class MyMembershipSerializer(serializers.ModelSerializer):
    restaurant = RestaurantPublicSerializer(read_only=True)

    class Meta:
        model = RestaurantMembership
        fields = ("id", "restaurant", "role")
