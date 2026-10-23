from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Service

User = get_user_model()


class ServiceApiTests(APITestCase):
    def setUp(self):
        self.active_service = Service.objects.create(
            name='Tap repair', category=Service.Category.PLUMBER,
            description='Repair a leaking tap', price='450.00',
        )
        Service.objects.create(
            name='Archived cleaning', category=Service.Category.CLEANER,
            description='Inactive service', price='600.00', is_active=False,
        )

    def test_public_list_only_shows_active_services(self):
        response = self.client.get('/api/services/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.active_service.id)

    def test_customer_cannot_create_service_but_admin_can(self):
        customer = User.objects.create_user(username='customer', password='Passphrase-54321!')
        self.client.force_authenticate(customer)
        payload = {
            'name': 'New service', 'category': 'other',
            'description': 'A new service', 'price': '800.00', 'is_active': True,
        }
        denied = self.client.post('/api/services/', payload, format='json')
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        admin = User.objects.create_user(username='admin', password='Passphrase-54321!', is_staff=True)
        self.client.force_authenticate(admin)
        created = self.client.post('/api/services/', payload, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
