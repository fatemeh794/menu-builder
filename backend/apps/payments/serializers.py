from rest_framework import serializers


class PaymentRedirectSerializer(serializers.Serializer):
    redirect_url = serializers.URLField(read_only=True)
