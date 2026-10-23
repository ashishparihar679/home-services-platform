from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from services.models import Service
from .models import Booking

User = get_user_model()


class BookingApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(username='customer', password='Passphrase-54321!')
        self.other_customer = User.objects.create_user(username='other', password='Passphrase-54321!')
        self.admin = User.objects.create_user(username='admin', password='Passphrase-54321!', is_staff=True)
        self.service = Service.objects.create(
            name='Tap repair', category=Service.Category.PLUMBER,
            description='Repair a leaking tap', price='450.00',
        )
        self.payload = {
            'service': self.service.id,
            'booking_date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'booking_time': '10:30:00',
            'address': '12 Main Street, Bhopal',
            'notes': 'Call before arrival',
            'price_at_booking': '1.00',
            'status': 'completed',
        }

    def test_booking_uses_authenticated_owner_and_service_price(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post('/api/bookings/', self.payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking = Booking.objects.get(pk=response.data['id'])
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(str(booking.price_at_booking), '450.00')
        self.assertEqual(booking.status, Booking.Status.PENDING)

    def test_customers_only_see_their_own_bookings_and_cannot_update_status(self):
        booking = Booking.objects.create(
            customer=self.other_customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='11:00:00',
            address='Other address',
        )
        self.client.force_authenticate(self.customer)

        own_bookings = self.client.get('/api/my-bookings/')
        status_update = self.client.patch(
            f'/api/bookings/{booking.id}/status/', {'status': 'confirmed'}, format='json'
        )
        self.assertEqual(own_bookings.status_code, status.HTTP_200_OK)
        self.assertEqual(len(own_bookings.data), 0)
        self.assertEqual(status_update.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_status_updates_must_follow_allowed_transitions(self):
        booking = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='11:00:00',
            address='12 Main Street, Bhopal',
        )
        self.client.force_authenticate(self.admin)

        confirmed = self.client.patch(
            f'/api/bookings/{booking.id}/status/', {'status': 'confirmed'}, format='json'
        )
        invalid_jump = self.client.patch(
            f'/api/bookings/{booking.id}/status/', {'status': 'completed'}, format='json'
        )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        self.assertEqual(invalid_jump.status_code, status.HTTP_400_BAD_REQUEST)
