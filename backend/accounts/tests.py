from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthenticationApiTests(APITestCase):
    def test_registration_creates_non_admin_user_with_hashed_password(self):
        response = self.client.post('/api/register/', {
            'username': 'new-customer',
            'email': 'customer@example.com',
            'password': 'A-Strong-Unique-Passphrase-584!',
            'is_staff': True,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='new-customer')
        self.assertFalse(user.is_staff)
        self.assertTrue(user.check_password('A-Strong-Unique-Passphrase-584!'))
        self.assertNotIn('password', response.data)

    def test_token_and_current_user_require_and_accept_jwt(self):
        user = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='A-Strong-Unique-Passphrase-584!',
        )

        unauthenticated = self.client.get('/api/me/')
        self.assertEqual(unauthenticated.status_code, status.HTTP_401_UNAUTHORIZED)

        token_response = self.client.post('/api/token/', {
            'username': user.username,
            'password': 'A-Strong-Unique-Passphrase-584!',
        }, format='json')
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")
        profile_response = self.client.get('/api/me/')
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data['username'], user.username)
