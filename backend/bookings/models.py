from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from accounts.models import WorkerProfile
from services.models import Service


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name='bookings')
    worker = models.ForeignKey(
        WorkerProfile,
        on_delete=models.SET_NULL,
        related_name='bookings',
        null=True,
        blank=True,
    )
    assignment_status = models.CharField(
        max_length=20,
        choices=(
            ('unassigned', 'Unassigned'),
            ('awaiting_response', 'Awaiting worker response'),
            ('accepted', 'Accepted'),
            ('rejected', 'Rejected'),
        ),
        default='unassigned',
        db_index=True,
    )
    price_at_booking = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    booking_date = models.DateField()
    booking_time = models.TimeField()
    address = models.TextField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.service.name} booking #{self.pk} ({self.get_status_display()})'
