from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Service(models.Model):
    class Category(models.TextChoices):
        ELECTRICIAN = 'electrician', 'Electrician'
        PLUMBER = 'plumber', 'Plumber'
        PAINTER = 'painter', 'Painter'
        CLEANER = 'cleaner', 'Cleaner'
        CARPENTER = 'carpenter', 'Carpenter'
        OTHER = 'other', 'Other'

    name = models.CharField(max_length=120)
    category = models.CharField(max_length=24, choices=Category.choices, default=Category.OTHER)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name
