from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify


class ProductReview(models.Model):
    product = models.ForeignKey(
        "Product", on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_reviews")
    order = models.ForeignKey(
        "orders.Order", on_delete=models.CASCADE, related_name="product_reviews")
    order_item = models.OneToOneField(
        "orders.OrderItem", on_delete=models.CASCADE, related_name="product_review")
    rating = models.PositiveSmallIntegerField()
    review = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review<{self.product_id}:{self.user_id}>"


class Category(models.Model):
    FOOD = "food"
    NON_FOOD = "non_food"
    CATEGORY_TYPE_CHOICES = [
        (FOOD, "Food"),
        (NON_FOOD, "Non Food"),
    ]

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    category_type = models.CharField(
        max_length=20, choices=CATEGORY_TYPE_CHOICES, default=FOOD)
    # Cloudinary delivery URL (HTTPS). Optional.
    image_url = models.URLField(blank=True)
    # Cloudinary public_id — used for deletion.
    image_public_id = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete("kitas:categories_public")

    def delete(self, *args, **kwargs):
        from django.core.cache import cache
        cache.delete("kitas:categories_public")
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    # Cloudinary delivery URL (HTTPS). Replaces the old ImageField.
    image_url = models.URLField(blank=True)
    # Cloudinary public_id — used for deletion and URL transformations.
    image_public_id = models.CharField(max_length=255, blank=True)
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete(f"kitas:product_detail:{self.id}")

    def delete(self, *args, **kwargs):
        from django.core.cache import cache
        cache.delete(f"kitas:product_detail:{self.id}")
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images")
    # Cloudinary delivery URL (HTTPS). Replaces the old ImageField.
    image_url = models.URLField()
    # Cloudinary public_id — used for deletion.
    public_id = models.CharField(max_length=255)
    order = models.PositiveSmallIntegerField(
        default=0, help_text="Display order in gallery (ascending).")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"Image<{self.product_id}:{self.pk}>"
