from django.urls import path

from .views import AdminBookingsView, BookingCreateView, BookingStatusUpdateView, MyBookingsView

urlpatterns = [
    path('bookings/', BookingCreateView.as_view(), name='booking-create'),
    path('my-bookings/', MyBookingsView.as_view(), name='my-bookings'),
    path('admin/bookings/', AdminBookingsView.as_view(), name='admin-bookings'),
    path('bookings/<int:pk>/status/', BookingStatusUpdateView.as_view(), name='booking-status-update'),
]
