from accounts.models import WorkerProfile

from .models import Booking


BOOKING_CONFLICT_STATUSES = (
    Booking.Status.PENDING,
    Booking.Status.CONFIRMED,
    Booking.Status.IN_PROGRESS,
)


def worker_has_booking_conflict(worker_id, booking_date, booking_time, exclude_booking_id=None):
    conflicts = Booking.objects.filter(
        worker_id=worker_id,
        booking_date=booking_date,
        booking_time=booking_time,
        status__in=BOOKING_CONFLICT_STATUSES,
    ).exclude(assignment_status='rejected')
    if exclude_booking_id is not None:
        conflicts = conflicts.exclude(pk=exclude_booking_id)
    return conflicts.exists()


def worker_is_eligible_for_booking(worker, service, booking_date, booking_time, exclude_booking_id=None):
    eligible = (
        worker.user.is_active
        and worker.is_active
        and worker.is_available
        and worker.verification_status == WorkerProfile.VerificationStatus.APPROVED
        and service.category in worker.skills
    )
    return eligible and not worker_has_booking_conflict(
        worker.pk, booking_date, booking_time, exclude_booking_id=exclude_booking_id,
    )
