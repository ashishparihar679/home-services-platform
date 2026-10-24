from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone

from accounts.models import WorkerProfile

from .models import Booking


@receiver(post_delete, sender=WorkerProfile)
def reset_orphaned_booking_assignments(sender, instance, using, **kwargs):
    """SET_NULL removes the FK first; normalize those bookings in the same delete transaction."""
    Booking.objects.using(using).filter(worker__isnull=True).exclude(
        assignment_status="unassigned"
    ).update(assignment_status="unassigned", updated_at=timezone.now())
