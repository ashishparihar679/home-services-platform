from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import WorkerProfile
from services.models import Service
from .models import Booking

User = get_user_model()


class BookingApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(username='customer', password='Passphrase-54321!')
        self.other_customer = User.objects.create_user(username='other', password='Passphrase-54321!')
        self.admin = User.objects.create_user(username='admin', password='Passphrase-54321!', is_staff=True)
        self.worker_user = User.objects.create_user(username='worker', password='Passphrase-54321!')
        self.worker = WorkerProfile.objects.create(
            user=self.worker_user,
            phone_number='1234567890',
            skills=['plumber'],
            city='Bhopal',
            address='Worker address',
            verification_status=WorkerProfile.VerificationStatus.APPROVED,
            is_available=True,
        )
        self.service = Service.objects.create(
            name='Tap repair', category=Service.Category.PLUMBER,
            description='Repair a leaking tap', price='450.00',
        )
        self.payload = {
            'service': self.service.id,
            'booking_date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'booking_time': '10:30:00',
            'contact_phone': '+91 9876543210',
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
        self.assertEqual(booking.contact_phone, '+91 9876543210')

    def test_booking_requires_a_valid_contact_phone(self):
        self.client.force_authenticate(self.customer)
        missing = self.client.post('/api/bookings/', {key: value for key, value in self.payload.items() if key != 'contact_phone'}, format='json')
        invalid = self.client.post('/api/bookings/', {**self.payload, 'contact_phone': '12abc'}, format='json')

        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('contact_phone', missing.data)
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('contact_phone', invalid.data)

    def test_customer_can_request_an_eligible_preferred_worker_without_assigning_them(self):
        self.worker_user.first_name = 'Asha'
        self.worker_user.last_name = 'Kumar'
        self.worker_user.save(update_fields=('first_name', 'last_name'))
        self.client.force_authenticate(self.customer)

        response = self.client.post('/api/bookings/', {
            **self.payload, 'preferred_worker_id': self.worker.pk,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking = Booking.objects.get(pk=response.data['id'])
        self.assertEqual(booking.preferred_worker, self.worker)
        self.assertIsNone(booking.worker)
        self.assertEqual(booking.assignment_status, 'unassigned')
        self.assertEqual(response.data['preferred_worker_name'], 'Asha Kumar')
        self.assertIsNone(response.data['worker_name'])

    def test_customer_cannot_prefer_unavailable_or_conflicting_worker(self):
        self.client.force_authenticate(self.customer)
        self.worker.is_available = False
        self.worker.save(update_fields=('is_available',))
        unavailable = self.client.post('/api/bookings/', {
            **self.payload, 'preferred_worker_id': self.worker.pk,
        }, format='json')
        self.assertEqual(unavailable.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('preferred_worker_id', unavailable.data)

        self.worker.is_available = True
        self.worker.save(update_fields=('is_available',))
        Booking.objects.create(
            customer=self.other_customer, service=self.service, price_at_booking=self.service.price,
            booking_date=self.payload['booking_date'], booking_time=self.payload['booking_time'],
            address='Address', worker=self.worker, assignment_status='awaiting_response',
        )
        conflicting = self.client.post('/api/bookings/', {
            **self.payload, 'preferred_worker_id': self.worker.pk,
        }, format='json')
        self.assertEqual(conflicting.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('preferred_worker_id', conflicting.data)

    def test_customer_can_cancel_only_own_pending_or_confirmed_booking(self):
        own = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='11:30:00', address='Own address',
        )
        other = Booking.objects.create(
            customer=self.other_customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='12:00:00', address='Other address',
        )
        self.client.force_authenticate(self.customer)

        cancelled = self.client.post(f'/api/my-bookings/{own.pk}/cancel/')
        denied = self.client.post(f'/api/my-bookings/{other.pk}/cancel/')
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK)
        self.assertEqual(cancelled.data['status'], Booking.Status.CANCELLED)
        self.assertEqual(denied.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Booking.objects.get(pk=other.pk).status, Booking.Status.PENDING)

        own.status = Booking.Status.IN_PROGRESS
        own.save(update_fields=('status',))
        too_late = self.client.post(f'/api/my-bookings/{own.pk}/cancel/')
        self.assertEqual(too_late.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_can_check_service_workers_without_private_data(self):
        self.worker_user.first_name = 'Asha'
        self.worker_user.last_name = 'Kumar'
        self.worker_user.save(update_fields=('first_name', 'last_name'))
        self.client.force_authenticate(self.customer)

        response = self.client.get(f"/api/services/{self.service.pk}/available-workers/", {
            'date': self.payload['booking_date'], 'time': self.payload['booking_time'],
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['service_id'], self.service.pk)
        self.assertEqual(len(response.data['workers']), 1)
        worker = response.data['workers'][0]
        self.assertEqual(worker['id'], self.worker.pk)
        self.assertEqual(worker['name'], 'Asha Kumar')
        self.assertEqual(worker['availability_status'], 'available')
        for private_field in ('phone_number', 'address', 'email', 'username'):
            self.assertNotIn(private_field, worker)

    def test_worker_availability_uses_approval_skill_availability_and_booking_status(self):
        self.client.force_authenticate(self.customer)
        pending_user = User.objects.create_user(username='pending-suggestion', password='Passphrase-54321!')
        WorkerProfile.objects.create(
            user=pending_user, skills=['plumber'], city='Bhopal', address='Private road',
            verification_status=WorkerProfile.VerificationStatus.PENDING,
        )
        unavailable_user = User.objects.create_user(username='unavailable-suggestion', password='Passphrase-54321!')
        unavailable = WorkerProfile.objects.create(
            user=unavailable_user, skills=['plumber'], city='Bhopal', address='Private road',
            verification_status=WorkerProfile.VerificationStatus.APPROVED, is_available=False,
        )
        inactive_user = User.objects.create_user(
            username='inactive-suggestion', password='Passphrase-54321!', is_active=False,
        )
        inactive = WorkerProfile.objects.create(
            user=inactive_user, skills=['plumber'], city='Bhopal', address='Private road',
            verification_status=WorkerProfile.VerificationStatus.APPROVED, is_available=True,
        )
        rejected_user = User.objects.create_user(username='rejected-suggestion', password='Passphrase-54321!')
        WorkerProfile.objects.create(
            user=rejected_user, skills=['plumber'], city='Bhopal', address='Private road',
            verification_status=WorkerProfile.VerificationStatus.REJECTED, is_available=True,
        )
        wrong_skill_user = User.objects.create_user(username='other-skill-suggestion', password='Passphrase-54321!')
        WorkerProfile.objects.create(
            user=wrong_skill_user, skills=['electrician'], city='Bhopal', address='Private road',
            verification_status=WorkerProfile.VerificationStatus.APPROVED, is_available=True,
        )

        response = self.client.get(f"/api/services/{self.service.pk}/available-workers/", {
            'date': self.payload['booking_date'], 'time': self.payload['booking_time'],
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        statuses = {worker['id']: worker['availability_status'] for worker in response.data['workers']}
        self.assertEqual(statuses, {self.worker.pk: 'available', unavailable.pk: 'unavailable', inactive.pk: 'unavailable'})

        conflicting_booking = Booking.objects.create(
            customer=self.other_customer, service=self.service, price_at_booking=self.service.price,
            booking_date=self.payload['booking_date'], booking_time=self.payload['booking_time'], address='Address',
            worker=self.worker, assignment_status='awaiting_response',
        )
        busy_response = self.client.get(f"/api/services/{self.service.pk}/available-workers/", {
            'date': self.payload['booking_date'], 'time': self.payload['booking_time'],
        })
        busy_statuses = {worker['id']: worker['availability_status'] for worker in busy_response.data['workers']}
        self.assertEqual(busy_statuses[self.worker.pk], 'busy')

        conflicting_booking.assignment_status = 'rejected'
        conflicting_booking.save(update_fields=('assignment_status',))
        rejected_assignment_response = self.client.get(f"/api/services/{self.service.pk}/available-workers/", {
            'date': self.payload['booking_date'], 'time': self.payload['booking_time'],
        })
        rejected_statuses = {worker['id']: worker['availability_status'] for worker in rejected_assignment_response.data['workers']}
        self.assertEqual(rejected_statuses[self.worker.pk], 'available')
        self.assertNotIn(pending_user.worker_profile.pk, rejected_statuses)
        self.assertNotIn(rejected_user.worker_profile.pk, rejected_statuses)

    def test_worker_availability_requires_customer_and_valid_date_and_time(self):
        url = f"/api/services/{self.service.pk}/available-workers/"
        unauthenticated = self.client.get(url, {'date': self.payload['booking_date'], 'time': '10:30'})
        self.assertEqual(unauthenticated.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(self.customer)
        missing_time = self.client.get(url, {'date': self.payload['booking_date']})
        self.assertEqual(missing_time.status_code, status.HTTP_400_BAD_REQUEST)

        wrong_category = Service.objects.create(
            name='Wiring', category=Service.Category.ELECTRICIAN,
            description='Electrical work', price='500.00',
        )
        no_matching_workers = self.client.get(f"/api/services/{wrong_category.pk}/available-workers/", {
            'date': self.payload['booking_date'], 'time': '10:30',
        })
        self.assertEqual(no_matching_workers.status_code, status.HTTP_200_OK)
        self.assertEqual(no_matching_workers.data['workers'], [])

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

    def test_customer_sees_worker_name_only_after_worker_accepts_assignment(self):
        self.worker_user.first_name = 'Ravi'
        self.worker_user.last_name = 'Sharma'
        self.worker_user.save(update_fields=('first_name', 'last_name'))
        booking = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='11:30:00',
            address='Customer address', contact_phone='+91 9876543210', worker=self.worker,
            assignment_status='awaiting_response',
        )
        self.client.force_authenticate(self.customer)

        awaiting = self.client.get('/api/my-bookings/')
        self.assertEqual(awaiting.data[0]['worker_name'], None)

        booking.assignment_status = 'accepted'
        booking.status = Booking.Status.CONFIRMED
        booking.save(update_fields=('assignment_status', 'status'))
        accepted = self.client.get('/api/my-bookings/')
        self.assertEqual(accepted.data[0]['worker_name'], 'Ravi Sharma')

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

    def test_only_staff_can_assign_eligible_worker_and_worker_can_manage_own_job(self):
        booking = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='12:00:00',
            contact_phone='+91 9876543210', address='Private customer address', notes='Private customer note',
        )
        self.client.force_authenticate(self.customer)
        denied = self.client.patch(
            f'/api/admin/bookings/{booking.pk}/assignment/', {'worker_id': self.worker.pk}, format='json'
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.admin)
        assigned = self.client.patch(
            f'/api/admin/bookings/{booking.pk}/assignment/', {'worker_id': self.worker.pk}, format='json'
        )
        self.assertEqual(assigned.status_code, status.HTTP_200_OK)
        self.assertEqual(assigned.data['assignment_status'], 'awaiting_response')
        self.assertEqual(Booking.objects.get(pk=booking.pk).worker, self.worker)

        self.client.force_authenticate(self.worker_user)
        jobs = self.client.get('/api/worker/jobs/')
        self.assertEqual(jobs.status_code, status.HTTP_200_OK)
        self.assertEqual(len(jobs.data), 1)
        self.assertNotIn('address', jobs.data[0])
        self.assertNotIn('customer_username', jobs.data[0])
        self.assertNotIn('contact_phone', jobs.data[0])

        accepted = self.client.patch(
            f'/api/worker/jobs/{booking.pk}/response/', {'action': 'accept'}, format='json'
        )
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertEqual(accepted.data['status'], Booking.Status.CONFIRMED)
        self.assertEqual(accepted.data['address'], 'Private customer address')
        self.assertEqual(accepted.data['customer_name'], self.customer.username)
        self.assertIn('customer_email', accepted.data)
        self.assertEqual(accepted.data['contact_phone'], '+91 9876543210')

        started = self.client.patch(
            f'/api/worker/jobs/{booking.pk}/progress/', {'status': Booking.Status.IN_PROGRESS}, format='json'
        )
        completed = self.client.patch(
            f'/api/worker/jobs/{booking.pk}/progress/', {'status': Booking.Status.COMPLETED}, format='json'
        )
        self.assertEqual(started.status_code, status.HTTP_200_OK)
        self.assertEqual(completed.status_code, status.HTTP_200_OK)

    def test_ineligible_worker_or_wrong_service_skill_cannot_be_assigned(self):
        booking = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='12:30:00', address='Address',
        )
        pending_user = User.objects.create_user(username='pending-worker', password='Passphrase-54321!')
        pending = WorkerProfile.objects.create(
            user=pending_user, phone_number='1234567890', skills=['plumber'], city='Bhopal', address='Road',
            is_available=True,
        )
        wrong_skill_user = User.objects.create_user(username='wrong-skill', password='Passphrase-54321!')
        wrong_skill = WorkerProfile.objects.create(
            user=wrong_skill_user, phone_number='1234567890', skills=['electrician'], city='Bhopal', address='Road',
            verification_status=WorkerProfile.VerificationStatus.APPROVED, is_available=True,
        )
        self.client.force_authenticate(self.admin)
        pending_response = self.client.patch(
            f'/api/admin/bookings/{booking.pk}/assignment/', {'worker_id': pending.pk}, format='json'
        )
        skill_response = self.client.patch(
            f'/api/admin/bookings/{booking.pk}/assignment/', {'worker_id': wrong_skill.pk}, format='json'
        )
        self.assertEqual(pending_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(skill_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_worker_cannot_be_assigned_to_overlapping_bookings_but_cancelled_jobs_do_not_block(self):
        date = timezone.localdate() + timedelta(days=1)
        first = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=date, booking_time='12:30:00', address='First address', worker=self.worker,
            assignment_status='accepted', status=Booking.Status.CONFIRMED,
        )
        second = Booking.objects.create(
            customer=self.other_customer, service=self.service, price_at_booking=self.service.price,
            booking_date=date, booking_time='12:30:00', address='Second address',
        )
        self.client.force_authenticate(self.admin)

        overlap = self.client.patch(
            f'/api/admin/bookings/{second.pk}/assignment/', {'worker_id': self.worker.pk}, format='json'
        )
        self.assertEqual(overlap.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNone(Booking.objects.get(pk=second.pk).worker)

        first.status = Booking.Status.CANCELLED
        first.save(update_fields=('status',))
        after_cancellation = self.client.patch(
            f'/api/admin/bookings/{second.pk}/assignment/', {'worker_id': self.worker.pk}, format='json'
        )
        self.assertEqual(after_cancellation.status_code, status.HTTP_200_OK)
        self.assertEqual(Booking.objects.get(pk=second.pk).worker, self.worker)

    def test_worker_cannot_read_or_update_another_workers_booking(self):
        other_user = User.objects.create_user(username='other-worker', password='Passphrase-54321!')
        other_worker = WorkerProfile.objects.create(
            user=other_user, phone_number='1234567890', skills=['plumber'], city='Bhopal', address='Road',
            verification_status=WorkerProfile.VerificationStatus.APPROVED, is_available=True,
        )
        booking = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='13:00:00', address='Address',
            worker=other_worker, assignment_status='awaiting_response',
        )
        self.client.force_authenticate(self.worker_user)
        self.assertEqual(self.client.get('/api/worker/jobs/').data, [])
        response = self.client.patch(
            f'/api/worker/jobs/{booking.pk}/response/', {'action': 'accept'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_worker_role_cannot_book_as_customer_or_progress_unaccepted_job(self):
        self.client.force_authenticate(self.worker_user)
        create = self.client.post('/api/bookings/', self.payload, format='json')
        self.assertEqual(create.status_code, status.HTTP_403_FORBIDDEN)

        booking = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='13:30:00', address='Address',
            worker=self.worker, assignment_status='awaiting_response',
        )
        progress = self.client.patch(
            f'/api/worker/jobs/{booking.pk}/progress/', {'status': Booking.Status.IN_PROGRESS}, format='json'
        )
        self.assertEqual(progress.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pending_worker_cannot_access_worker_job_endpoints(self):
        pending_user = User.objects.create_user(username='not-approved', password='Passphrase-54321!')
        pending_profile = WorkerProfile.objects.create(
            user=pending_user, phone_number='1234567890', skills=['plumber'], city='Bhopal', address='Road',
        )
        booking = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='14:00:00', address='Address',
            worker=pending_profile, assignment_status='awaiting_response',
        )
        self.client.force_authenticate(pending_user)
        jobs = self.client.get('/api/worker/jobs/')
        response = self.client.patch(
            f'/api/worker/jobs/{booking.pk}/response/', {'action': 'accept'}, format='json'
        )
        self.assertEqual(jobs.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_unassign_worker_and_booking_status_is_preserved(self):
        booking = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='15:00:00',
            address='Address', status=Booking.Status.CONFIRMED,
            worker=self.worker, assignment_status='awaiting_response',
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f'/api/admin/bookings/{booking.pk}/assignment/', {'worker_id': None}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertIsNone(booking.worker)
        self.assertEqual(booking.assignment_status, 'unassigned')
        self.assertEqual(booking.status, Booking.Status.CONFIRMED)

    def test_deleting_worker_profile_resets_booking_assignment_without_deleting_booking(self):
        booking = Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='15:30:00',
            address='Address', status=Booking.Status.IN_PROGRESS,
            worker=self.worker, assignment_status='accepted',
        )

        self.worker.delete()

        booking.refresh_from_db()
        self.assertTrue(Booking.objects.filter(pk=booking.pk).exists())
        self.assertIsNone(booking.worker)
        self.assertEqual(booking.assignment_status, 'unassigned')
        self.assertEqual(booking.status, Booking.Status.IN_PROGRESS)


class SuperuserAnalyticsApiTests(APITestCase):
    endpoint = '/api/super/analytics/'

    def setUp(self):
        self.customer = User.objects.create_user(username='analytics-customer', password='Passphrase-54321!')
        self.admin = User.objects.create_user(username='analytics-staff', password='Passphrase-54321!', is_staff=True)
        self.worker_user = User.objects.create_user(username='analytics-worker', password='Passphrase-54321!')
        self.worker = WorkerProfile.objects.create(
            user=self.worker_user, phone_number='1234567890', skills=['plumber'], city='Bhopal', address='Road',
            verification_status=WorkerProfile.VerificationStatus.APPROVED, is_available=True,
        )
        self.service = Service.objects.create(
            name='Analytics tap repair', category=Service.Category.PLUMBER,
            description='Repair tap', price='450.00',
        )

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_staff_request_is_forbidden(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_and_worker_requests_are_forbidden(self):
        for user in (self.customer, self.worker_user):
            with self.subTest(username=user.username):
                self.client.force_authenticate(user)
                response = self.client.get(self.endpoint)
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_receives_aggregate_metrics_only(self):
        pending_user = User.objects.create_user(username='pending-analytics-worker', password='Passphrase-54321!')
        WorkerProfile.objects.create(
            user=pending_user, phone_number='5551234567', skills=['plumber'], city='Bhopal', address='Road',
        )
        Booking.objects.create(
            customer=self.customer, service=self.service, price_at_booking=self.service.price,
            booking_date=timezone.localdate() + timedelta(days=1), booking_time='16:00:00',
            address='Private customer address', notes='Private customer note',
        )
        superuser = User.objects.create_superuser(
            username='analytics-superuser', email='analytics@example.com', password='Passphrase-54321!'
        )
        self.client.force_authenticate(superuser)

        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data), {
            'worker_count', 'pending_worker_count', 'booking_count', 'active_service_count',
            'bookings_by_status', 'bookings_by_category',
        })
        self.assertEqual(response.data['worker_count'], 2)
        self.assertEqual(response.data['pending_worker_count'], 1)
        self.assertEqual(response.data['booking_count'], 1)
        self.assertEqual(response.data['active_service_count'], 1)
        self.assertEqual(response.data['bookings_by_status']['pending'], 1)
        self.assertEqual(response.data['bookings_by_category'], [{'category': 'plumber', 'count': 1}])
