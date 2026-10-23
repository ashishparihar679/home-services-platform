from django.contrib import admin

from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'is_active', 'updated_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'description')

    def has_delete_permission(self, request, obj=None):
        return False
