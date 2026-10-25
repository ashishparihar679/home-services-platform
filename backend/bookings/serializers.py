import re

from django.utils import timezone
from rest_framework import serializers

from accounts.models import WorkerProfile
from services.models import Service
from .availability import worker_is_eligible_for_booking
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.filter(is_active=True))
    service_name = serializers.CharField(source='service.name', read_only=True)
    customer_id = serializers.IntegerField(read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source='customer.email', read_only=True)
    worker_id = serializers.IntegerField(read_only=True, allow_null=True)
    worker_username = serializers.CharField(source='worker.user.username', read_only=True, allow_null=True)
    worker_name = serializers.SerializerMethodField()
    preferred_worker_id = serializers.PrimaryKeyRelatedField(
        source='preferred_worker', queryset=WorkerProfile.objects.select_related('user').all(),
        required=False, allow_null=True,
    )
    preferred_worker_name = serializers.SerializerMethodField()
    contact_phone = serializers.CharField(max_length=30, required=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'service', 'service_name', 'customer_id', 'customer_username', 'customer_name',
            'customer_email', 'worker_id', 'worker_username', 'worker_name', 'preferred_worker_id',
            'preferred_worker_name', 'assignment_status',
            'price_at_booking', 'booking_date', 'contact_phone',
            'booking_time', 'address', 'notes', 'status', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'price_at_booking', 'status', 'customer_id', 'customer_username', 'customer_name',
            'customer_email', 'worker_id', 'worker_username', 'worker_name', 'preferred_worker_name',
            'assignment_status', 'created_at', 'updated_at',
        )

    def get_customer_name(self, booking):
        name = ' '.join(part for part in (booking.customer.first_name, booking.customer.last_name) if part).strip()
        return name or booking.customer.username

    def get_worker_name(self, booking):
        if booking.assignment_status != 'accepted' or booking.worker is None:
            return None
        name = ' '.join(part for part in (booking.worker.user.first_name, booking.worker.user.last_name) if part).strip()
        return name or 'Bloomcare Professional'

    def get_preferred_worker_name(self, booking):
        if booking.preferred_worker is None:
            return None
        name = ' '.join(part for part in (
            booking.preferred_worker.user.first_name,
            booking.preferred_worker.user.last_name,
        ) if part).strip()
        return name or 'Bloomcare Professional'

    def validate(self, attrs):
        preferred_worker = attrs.get('preferred_worker')
        if preferred_worker is None:
            return attrs

        service = attrs.get('service')
        booking_date = attrs.get('booking_date')
        booking_time = attrs.get('booking_time')
        if service and booking_date and booking_time and not worker_is_eligible_for_booking(
            preferred_worker, service, booking_date, booking_time,
        ):
            raise serializers.ValidationError({
                'preferred_worker_id': 'This worker is no longer available for the selected service, date, and time.'
            })
        return attrs

    def validate_booking_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('Booking date cannot be in the past.')
        return value

    def validate_address(self, value):
        address = value.strip()
        if not address:
            raise serializers.ValidationError('A service address is required.')
        return address

    def validate_contact_phone(self, value):
        phone = value.strip()
        digits = re.sub(r'\D', '', phone)
        if not re.fullmatch(r'\+?[0-9\s().-]+', phone) or not 7 <= len(digits) <= 15:
            raise serializers.ValidationError('Enter a valid phone number with 7 to 15 digits.')
        return phone


class WorkerBookingSerializer(BookingSerializer):
    """Hide customer contact/location details until the worker accepts the job."""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.assignment_status != 'accepted':
            for field in (
                'customer_id', 'customer_username', 'customer_name', 'customer_email',
                'preferred_worker_id', 'preferred_worker_name', 'contact_phone', 'address', 'notes',
            ):
                data.pop(field, None)
        return data


class WorkerAvailabilityQuerySerializer(serializers.Serializer):
    date = serializers.DateField()
    time = serializers.TimeField()

    def validate_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('Availability can only be checked for today or a future date.')
        return value
