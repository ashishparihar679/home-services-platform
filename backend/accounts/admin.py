from django.contrib import admin

from .models import WorkerProfile


@admin.register(WorkerProfile)
class WorkerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'city', 'verification_status', 'is_available', 'is_active', 'created_at')
    list_filter = ('verification_status', 'is_available', 'is_active', 'city')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name', 'city')
    readonly_fields = ('created_at', 'updated_at')
