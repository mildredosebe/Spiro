from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_order_delivery_proof_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="customer_confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
