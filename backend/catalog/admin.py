from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    readonly_fields = ("thumbnail", "image_url", "public_id", "order", "created_at")
    fields = ("thumbnail", "image_url", "public_id", "order", "created_at")

    def thumbnail(self, obj):
        if obj.image_url:
            return format_html(
                '<img src="{}" style="height:60px;border-radius:6px;" />',
                obj.image_url,
            )
        return "—"
    thumbnail.short_description = "Preview"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "category_type", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "price", "stock", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name",)
    readonly_fields = ("image_url", "image_public_id", "created_at", "updated_at")
    inlines = [ProductImageInline]
