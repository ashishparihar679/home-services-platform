from decimal import Decimal

from rest_framework import serializers

from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))

    class Meta:
        model = Service
        fields = ('id', 'name', 'category', 'description', 'price', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
