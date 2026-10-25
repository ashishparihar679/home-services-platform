from django.db import transaction
from django.db.models import Count
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import WorkerProfile
from accounts.permissions import IsApprovedActiveWorker, IsCustomer, IsStaffAdmin, IsSuperuserOnly
from services.models import Service
from .models import Booking
from .serializers import BookingSerializer, WorkerAvailabilityQuerySerializer, WorkerBookingSerializer


ALLOWED_STATUS_TRANSITIONS = {
    Booking.Status.PENDING: {Booking.Status.CONFIRMED, Booking.Status.CANCELLED},
    Booking.Status.CONFIRMED: {Booking.Status.IN_PROGRESS, Booking.Status.CANCELLED},
    Booking.Status.IN_PROGRESS: {Booking.Status.COMPLETED},
    Booking.Status.COMPLETED: set(),
    Booking.Status.CANCELLED: set(),
}
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


class ServiceAvailableWorkersView(APIView):
    permission_classes = (IsCustomer,)

    def get(self, request, service_id):
        service = Service.objects.filter(pk=service_id, is_active=True).first()
        if service is None:
            raise NotFound('Service not found.')

        query = WorkerAvailabilityQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        booking_date = query.validated_data['date']
        booking_time = query.validated_data['time']

        # Keep pending and rejected applications private. Only approved workers
        # who list this service category are shown as public suggestions.
        qualified_workers = [
            worker for worker in WorkerProfile.objects.select_related('user').filter(
                verification_status=WorkerProfile.VerificationStatus.APPROVED,
            ).order_by('pk')
            if service.category in worker.skills
        ]
        worker_ids = [worker.pk for worker in qualified_workers]
        conflicting_worker_ids = set(Booking.objects.filter(
            worker_id__in=worker_ids,
            booking_date=booking_date,
            booking_time=booking_time,
            status__in=BOOKING_CONFLICT_STATUSES,
        ).exclude(assignment_status='rejected').values_list('worker_id', flat=True))

        professionals = []
        for worker in qualified_workers:
            eligible = worker.user.is_active and worker.is_active and worker.is_available
            if not eligible:
                availability = 'unavailable'
            elif worker.pk in conflicting_worker_ids:
                availability = 'busy'
            else:
                availability = 'available'

            name = ' '.join(part for part in (worker.user.first_name, worker.user.last_name) if part).strip()
            professionals.append({
                'id': worker.pk,
                'name': name or 'Bloomcare Professional',
                'skills': worker.skills,
                'experience_years': worker.experience_years,
                'city': worker.city,
                'availability_status': availability,
            })

        return Response({
            'service_id': service.pk,
            'date': booking_date,
            'time': booking_time,
            'workers': professionals,
        })


class BookingCreateView(generics.CreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = (IsCustomer,)

    def perform_create(self, serializer):
        service = serializer.validated_data['service']
        serializer.save(customer=self.request.user, price_at_booking=service.price)


class MyBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = (IsCustomer,)

    def get_queryset(self):
        return Booking.objects.filter(customer=self.request.user).select_related('service', 'customer')


class AdminBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = (IsStaffAdmin,)

    def get_queryset(self):
        return Booking.objects.select_related('service', 'customer', 'worker__user')


class BookingStatusUpdateView(APIView):
    permission_classes = (IsStaffAdmin,)

    def patch(self, request, pk):
        requested_status = request.data.get('status')
        valid_statuses = {value for value, _label in Booking.Status.choices}
        if requested_status not in valid_statuses:
            raise ValidationError({'status': 'Choose a valid booking status.'})

        with transaction.atomic():
            try:
                booking = Booking.objects.select_for_update().select_related('service', 'customer', 'worker__user').get(pk=pk)
            except Booking.DoesNotExist:
                return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

            allowed = ALLOWED_STATUS_TRANSITIONS[booking.status]
            if requested_status not in allowed:
                raise ValidationError({
                    'status': f'Cannot change status from {booking.status} to {requested_status}.'
                })
            booking.status = requested_status
            booking.save(update_fields=('status', 'updated_at'))

        return Response(BookingSerializer(booking).data)


class BookingAssignmentView(APIView):
    permission_classes = (IsStaffAdmin,)

    def patch(self, request, pk):
        if 'worker_id' not in request.data:
            raise ValidationError({'worker_id': 'Provide a worker profile ID or null to unassign.'})
        worker_id = request.data.get('worker_id')
        if worker_id is not None:
            try:
                worker_id = int(worker_id)
            except (TypeError, ValueError):
                raise ValidationError({'worker_id': 'Provide a valid worker profile ID or null.'})

        with transaction.atomic():
            try:
                booking = Booking.objects.select_for_update().select_related('service', 'customer').get(pk=pk)
            except Booking.DoesNotExist:
                raise NotFound('Booking not found.')

            if booking.status not in (Booking.Status.PENDING, Booking.Status.CONFIRMED):
                raise ValidationError({'booking': 'Only pending or confirmed bookings can be assigned.'})

            if worker_id is None:
                booking.worker = None
                booking.assignment_status = 'unassigned'
            else:
                try:
                    worker = WorkerProfile.objects.select_for_update().select_related('user').get(pk=worker_id)
                except WorkerProfile.DoesNotExist:
                    raise ValidationError({'worker_id': 'Worker profile not found.'})
                eligible = (
                    worker.user.is_active
                    and worker.is_active
                    and worker.is_available
                    and worker.verification_status == WorkerProfile.VerificationStatus.APPROVED
                )
                if not eligible:
                    raise ValidationError({'worker_id': 'Only approved, active, available workers can be assigned.'})
                if booking.service.category not in worker.skills:
                    raise ValidationError({'worker_id': 'This worker does not list the booking service category as a skill.'})
                if worker_has_booking_conflict(
                    worker.pk, booking.booking_date, booking.booking_time, exclude_booking_id=booking.pk,
                ):
                    raise ValidationError({'worker_id': 'This worker already has a booking at the selected date and time.'})
                booking.worker = worker
                booking.assignment_status = 'awaiting_response'

            booking.save(update_fields=('worker', 'assignment_status', 'updated_at'))

        return Response(BookingSerializer(booking).data)


class WorkerJobsView(generics.ListAPIView):
    serializer_class = WorkerBookingSerializer
    permission_classes = (IsApprovedActiveWorker,)

    def get_queryset(self):
        return Booking.objects.filter(worker=self.request.user.worker_profile).select_related(
            'service', 'customer', 'worker__user'
        )


class WorkerJobResponseView(APIView):
    permission_classes = (IsApprovedActiveWorker,)

    def patch(self, request, pk):
        action = request.data.get('action')
        if action not in ('accept', 'reject'):
            raise ValidationError({'action': 'Choose accept or reject.'})

        with transaction.atomic():
            try:
                booking = Booking.objects.select_for_update().select_related(
                    'service', 'customer', 'worker__user'
                ).get(pk=pk, worker=request.user.worker_profile)
            except Booking.DoesNotExist:
                raise NotFound('Assigned job not found.')

            if booking.assignment_status != 'awaiting_response':
                raise ValidationError({'action': 'This job is no longer awaiting a worker response.'})
            if booking.status not in (Booking.Status.PENDING, Booking.Status.CONFIRMED):
                raise ValidationError({'status': 'This booking can no longer be accepted or rejected.'})

            if action == 'accept':
                booking.assignment_status = 'accepted'
                if booking.status == Booking.Status.PENDING:
                    booking.status = Booking.Status.CONFIRMED
                update_fields = ('assignment_status', 'status', 'updated_at')
            else:
                booking.assignment_status = 'rejected'
                update_fields = ('assignment_status', 'updated_at')
            booking.save(update_fields=update_fields)

        return Response(WorkerBookingSerializer(booking).data)


class WorkerJobProgressView(APIView):
    permission_classes = (IsApprovedActiveWorker,)

    def patch(self, request, pk):
        requested_status = request.data.get('status')
        if requested_status not in (Booking.Status.IN_PROGRESS, Booking.Status.COMPLETED):
            raise ValidationError({'status': 'Workers may set a job to in progress or completed.'})

        with transaction.atomic():
            try:
                booking = Booking.objects.select_for_update().select_related(
                    'service', 'customer', 'worker__user'
                ).get(pk=pk, worker=request.user.worker_profile)
            except Booking.DoesNotExist:
                raise NotFound('Assigned job not found.')

            if booking.assignment_status != 'accepted':
                raise ValidationError({'assignment': 'Accept this job before updating its progress.'})
            allowed = {
                Booking.Status.CONFIRMED: Booking.Status.IN_PROGRESS,
                Booking.Status.IN_PROGRESS: Booking.Status.COMPLETED,
            }
            if allowed.get(booking.status) != requested_status:
                raise ValidationError({'status': f'Cannot change status from {booking.status} to {requested_status}.'})
            booking.status = requested_status
            booking.save(update_fields=('status', 'updated_at'))

        return Response(WorkerBookingSerializer(booking).data)


class SuperuserAnalyticsView(APIView):
    """Return aggregate platform metrics without exposing customer records."""

    permission_classes = (IsSuperuserOnly,)

    def get(self, request):
        booking_counts = dict(
            Booking.objects.values_list("status").annotate(count=Count("pk"))
        )
        all_statuses = (value for value, _label in Booking.Status.choices)
        bookings_by_status = {value: booking_counts.get(value, 0) for value in all_statuses}
        bookings_by_category = list(
            Booking.objects.values("service__category")
            .annotate(count=Count("pk"))
            .order_by("service__category")
        )

        return Response({
            "worker_count": WorkerProfile.objects.count(),
            "pending_worker_count": WorkerProfile.objects.filter(
                verification_status=WorkerProfile.VerificationStatus.PENDING
            ).count(),
            "booking_count": Booking.objects.count(),
            "active_service_count": Service.objects.filter(is_active=True).count(),
            "bookings_by_status": bookings_by_status,
            "bookings_by_category": [
                {"category": item["service__category"], "count": item["count"]}
                for item in bookings_by_category
            ],
        })
