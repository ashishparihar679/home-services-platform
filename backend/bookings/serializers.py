from django.utils import timezone
from rest_framework import serializers

from services.models import Service
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.filter(is_active=True))
    service_name = serializers.CharField(source='service.name', read_only=True)
    customer_id = serializers.IntegerField(read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    worker_id = serializers.IntegerField(read_only=True, allow_null=True)
    worker_username = serializers.CharField(source='worker.user.username', read_only=True, allow_null=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'service', 'service_name', 'customer_id', 'customer_username', 'worker_id',
            'worker_username', 'assignment_status',
            'price_at_booking', 'booking_date',
            'booking_time', 'address', 'notes', 'status', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'price_at_booking', 'status', 'worker_id', 'worker_username',
            'assignment_status', 'created_at', 'updated_at',
        )

    def validate_booking_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('Booking date cannot be in the past.')
        return value

    def validate_address(self, value):
        address = value.strip()
        if not address:
            raise serializers.ValidationError('A service address is required.')
        return address


class WorkerBookingSerializer(BookingSerializer):
    """Hide customer contact/location details until the worker accepts the job."""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.assignment_status != 'accepted':
            for field in ('customer_id', 'customer_username', 'address', 'notes'):
                data.pop(field, None)
        return data
