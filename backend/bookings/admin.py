from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'service', 'customer', 'worker', 'booking_date', 'booking_time', 'status', 'assignment_status', 'price_at_booking')
    list_filter = ('status', 'assignment_status', 'booking_date')
    search_fields = ('customer__username', 'customer__email', 'service__name', 'address')
    # Status changes must go through the validated API transition workflow.
    readonly_fields = ('status', 'worker', 'assignment_status', 'price_at_booking', 'created_at', 'updated_at')
