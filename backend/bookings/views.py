from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking
from .permissions import IsAdminUser
from .serializers import BookingSerializer


ALLOWED_STATUS_TRANSITIONS = {
    Booking.Status.PENDING: {Booking.Status.CONFIRMED, Booking.Status.CANCELLED},
    Booking.Status.CONFIRMED: {Booking.Status.IN_PROGRESS, Booking.Status.CANCELLED},
    Booking.Status.IN_PROGRESS: {Booking.Status.COMPLETED},
    Booking.Status.COMPLETED: set(),
    Booking.Status.CANCELLED: set(),
}


class BookingCreateView(generics.CreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def perform_create(self, serializer):
        service = serializer.validated_data['service']
        serializer.save(customer=self.request.user, price_at_booking=service.price)


class MyBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Booking.objects.filter(customer=self.request.user).select_related('service', 'customer')


class AdminBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = (IsAdminUser,)

    def get_queryset(self):
        return Booking.objects.select_related('service', 'customer')


class BookingStatusUpdateView(APIView):
    permission_classes = (IsAdminUser,)

    def patch(self, request, pk):
        requested_status = request.data.get('status')
        valid_statuses = {value for value, _label in Booking.Status.choices}
        if requested_status not in valid_statuses:
            raise ValidationError({'status': 'Choose a valid booking status.'})

        with transaction.atomic():
            try:
                booking = Booking.objects.select_for_update().get(pk=pk)
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
