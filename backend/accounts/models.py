from django.conf import settings
from django.db import models


class WorkerProfile(models.Model):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending verification"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="worker_profile",
    )
    skills = models.JSONField(default=list)
    experience_years = models.PositiveSmallIntegerField(default=0)
    phone_number = models.CharField(max_length=30, blank=True)
    city = models.CharField(max_length=100)
    address = models.TextField()
    bio = models.CharField(max_length=500, blank=True)
    verification_status = models.CharField(
        max_length=12,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        db_index=True,
    )
    is_available = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"Worker profile for {self.user.username} ({self.verification_status})"
