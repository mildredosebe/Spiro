from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0005_alter_productimage_options_remove_product_image_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="image_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="category",
            name="image_public_id",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
