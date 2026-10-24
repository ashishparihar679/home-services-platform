from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import WorkerProfile

User = get_user_model()
STRONG_PASSWORD = "A-Strong-Unique-Passphrase-584!"


class AuthenticationApiTests(APITestCase):
    def test_registration_creates_non_admin_customer_and_ignores_privilege_fields(self):
        response = self.client.post('/api/register/', {
            'username': 'new-customer',
            'email': 'customer@example.com',
            'password': STRONG_PASSWORD,
            'is_staff': True,
            'is_superuser': True,
            'account_type': 'customer',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='new-customer')
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password(STRONG_PASSWORD))
        self.assertNotIn('password', response.data)

    def test_public_registration_cannot_select_admin(self):
        response = self.client.post('/api/register/', {
            'username': 'fake-admin', 'email': 'fake@example.com',
            'password': STRONG_PASSWORD, 'account_type': 'admin',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='fake-admin').exists())

    def test_worker_registration_creates_pending_profile_atomically(self):
        response = self.client.post('/api/register/', {
            'username': 'new-worker', 'email': 'worker@example.com',
            'password': STRONG_PASSWORD, 'account_type': 'worker',
            'phone_number': '+91 9876543210', 'skills': ['plumber'],
            'experience_years': 3, 'city': 'Bhopal', 'address': 'Main Road', 'bio': 'Experienced plumber',
            'is_staff': True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='new-worker')
        profile = WorkerProfile.objects.get(user=user)
        self.assertFalse(user.is_staff)
        self.assertEqual(profile.verification_status, WorkerProfile.VerificationStatus.PENDING)
        self.assertFalse(profile.is_available)
        self.assertEqual(profile.skills, ['plumber'])

    def test_token_role_match_and_legacy_login(self):
        user = User.objects.create_user(username='customer', password=STRONG_PASSWORD)
        worker = User.objects.create_user(username='worker', password=STRONG_PASSWORD)
        WorkerProfile.objects.create(
            user=worker, phone_number='1234567890', skills=['plumber'], city='Bhopal', address='Main Road'
        )
        admin = User.objects.create_user(username='admin', password=STRONG_PASSWORD, is_staff=True)

        unauthenticated = self.client.get('/api/me/')
        self.assertEqual(unauthenticated.status_code, status.HTTP_401_UNAUTHORIZED)

        wrong_role = self.client.post('/api/token/', {
            'username': worker.username, 'password': STRONG_PASSWORD, 'account_type': 'customer',
        }, format='json')
        self.assertEqual(wrong_role.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', wrong_role.data)

        matching_worker = self.client.post('/api/token/', {
            'username': worker.username, 'password': STRONG_PASSWORD, 'account_type': 'worker',
        }, format='json')
        self.assertEqual(matching_worker.status_code, status.HTTP_200_OK)
        self.assertIn('access', matching_worker.data)

        # Existing clients that omit account_type keep receiving the standard JWT response.
        legacy_login = self.client.post('/api/token/', {
            'username': user.username, 'password': STRONG_PASSWORD,
        }, format='json')
        self.assertEqual(legacy_login.status_code, status.HTTP_200_OK)
        self.assertIn('refresh', legacy_login.data)

        admin_login = self.client.post('/api/token/', {
            'username': admin.username, 'password': STRONG_PASSWORD, 'account_type': 'admin',
        }, format='json')
        self.assertEqual(admin_login.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_login.data['access']}")
        staff_profile = self.client.get('/api/me/')
        self.assertFalse(staff_profile.data['is_superuser'])

        superuser = User.objects.create_superuser(
            username='root-admin', email='root-admin@example.com', password=STRONG_PASSWORD
        )
        self.client.force_authenticate(superuser)
        superuser_profile = self.client.get('/api/me/')
        self.assertEqual(superuser_profile.data['role'], 'admin')
        self.assertTrue(superuser_profile.data['is_superuser'])

        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {matching_worker.data['access']}")
        profile_response = self.client.get('/api/me/')
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data['role'], 'worker')
        self.assertEqual(profile_response.data['worker_profile']['verification_status'], 'pending')

    def test_existing_customer_can_apply_without_creating_a_second_user(self):
        user = User.objects.create_user(username='existing', password=STRONG_PASSWORD)
        self.client.force_authenticate(user)
        response = self.client.post('/api/worker/apply/', {
            'phone_number': '+91 1234567890', 'skills': ['electrician'],
            'experience_years': 2, 'city': 'Indore', 'address': 'Central area',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.filter(username='existing').count(), 1)
        self.assertEqual(WorkerProfile.objects.get(user=user).verification_status, 'pending')
        repeated = self.client.post('/api/worker/apply/', {
            'phone_number': '1234567890', 'skills': ['plumber'], 'city': 'Indore', 'address': 'A road',
        }, format='json')
        self.assertEqual(repeated.status_code, status.HTTP_403_FORBIDDEN)

    def test_only_staff_can_review_worker(self):
        worker = User.objects.create_user(username='worker-review', password=STRONG_PASSWORD)
        profile = WorkerProfile.objects.create(
            user=worker, phone_number='1234567890', skills=['plumber'], city='Bhopal', address='Main Road'
        )
        customer = User.objects.create_user(username='customer-review', password=STRONG_PASSWORD)
        self.client.force_authenticate(customer)
        denied = self.client.patch(f'/api/admin/workers/{profile.pk}/', {'verification_status': 'approved'}, format='json')
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        admin = User.objects.create_user(username='staff-review', password=STRONG_PASSWORD, is_staff=True)
        self.client.force_authenticate(admin)
        approved = self.client.patch(
            f'/api/admin/workers/{profile.pk}/', {'verification_status': 'approved'}, format='json'
        )
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.__class__.objects.get(pk=profile.pk).verification_status, 'approved')
