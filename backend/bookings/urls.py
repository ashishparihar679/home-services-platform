from django.urls import path

from .views import (
    AdminBookingsView,
    BookingAssignmentView,
    BookingCreateView,
    BookingStatusUpdateView,
    MyBookingsView,
    WorkerJobProgressView,
    WorkerJobResponseView,
    WorkerJobsView,
    SuperuserAnalyticsView,
)

urlpatterns = [
    path('bookings/', BookingCreateView.as_view(), name='booking-create'),
    path('my-bookings/', MyBookingsView.as_view(), name='my-bookings'),
    path('admin/bookings/', AdminBookingsView.as_view(), name='admin-bookings'),
    path('admin/bookings/<int:pk>/assignment/', BookingAssignmentView.as_view(), name='booking-assignment'),
    path('bookings/<int:pk>/status/', BookingStatusUpdateView.as_view(), name='booking-status-update'),
    path('worker/jobs/', WorkerJobsView.as_view(), name='worker-jobs'),
    path('worker/jobs/<int:pk>/response/', WorkerJobResponseView.as_view(), name='worker-job-response'),
    path('worker/jobs/<int:pk>/progress/', WorkerJobProgressView.as_view(), name='worker-job-progress'),
    path('super/analytics/', SuperuserAnalyticsView.as_view(), name='superuser-analytics'),
]
