from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_booking_preferred_worker'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='contact_phone',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
    ]
