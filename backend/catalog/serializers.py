from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from orders.models import Order, OrderItem

from .cloudinary_utils import ImageTooLargeError, upload_image
from .models import Category, Product, ProductReview, ProductImage

_MAX_GALLERY = 8  # maximum gallery images per product


class CategorySerializer(serializers.ModelSerializer):
    # image is write-only (upload); image_url is the read-only Cloudinary URL
    image = serializers.ImageField(
        write_only=True, required=False, allow_null=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "category_type",
            "image",
            "image_url",
            "image_public_id",
            "is_active",
        ]
        read_only_fields = ["image_url", "image_public_id"]

    def _upload_image(self, file) -> dict:
        try:
            return upload_image(file, folder="kitas/categories")
        except ImageTooLargeError as exc:
            raise serializers.ValidationError({"image": str(exc)}) from exc

    def create(self, validated_data):
        image_file = validated_data.pop("image", None)
        if image_file:
            result = self._upload_image(image_file)
            validated_data["image_url"] = result["secure_url"]
            validated_data["image_public_id"] = result["public_id"]
        return super().create(validated_data)

    def update(self, instance, validated_data):
        image_file = validated_data.pop("image", None)
        if image_file:
            from .cloudinary_utils import delete_image
            delete_image(instance.image_public_id)
            result = self._upload_image(image_file)
            validated_data["image_url"] = result["secure_url"]
            validated_data["image_public_id"] = result["public_id"]
        return super().update(instance, validated_data)


class ProductReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = ["id", "rating", "review", "reviewer_name", "created_at"]

    def get_reviewer_name(self, obj) -> str:
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.username or obj.user.email


class ProductImageSerializer(serializers.ModelSerializer):
    """Read-only serializer for gallery images returned to the frontend."""

    class Meta:
        model = ProductImage
        fields = ["id", "image_url", "public_id", "order"]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category", queryset=Category.objects.filter(is_active=True), write_only=True
    )
    # image is write-only (upload); image_url is the read-only Cloudinary URL
    image = serializers.ImageField(
        write_only=True, required=False, allow_null=True)
    gallery = ProductImageSerializer(
        source="images", many=True, read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "image",
            "image_url",
            "image_public_id",
            "gallery",
            "price",
            "stock",
            "is_active",
            "category",
            "category_id",
            "average_rating",
            "reviews_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["image_url", "image_public_id"]

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def _get_uploaded_files(self):
        request = self.context.get("request")
        if not request:
            return []
        files = list(request.FILES.getlist("gallery"))
        if "image" in request.FILES:
            files.append(request.FILES["image"])
        return files

    def validate(self, attrs):
        for f in self._get_uploaded_files():
            try:
                f.seek(0, 2)
                size = f.tell()
                f.seek(0)
            except Exception:
                size = getattr(f, "size", 0)
            if size > 5 * 1024 * 1024:
                raise serializers.ValidationError(
                    f"'{f.name}' exceeds the 5 MB limit ({size // (1024 * 1024)} MB)."
                )
        return attrs

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _upload_primary(self, file) -> dict:
        """Upload primary image; propagates ImageTooLargeError as ValidationError."""
        try:
            return upload_image(file)
        except ImageTooLargeError as exc:
            raise serializers.ValidationError({"image": str(exc)}) from exc

    def _upload_gallery(self, product: Product, files: list) -> None:
        """Upload gallery files and create ProductImage rows."""
        existing_count = product.images.count()
        allowed = _MAX_GALLERY - existing_count
        for file in files[:allowed]:
            try:
                result = upload_image(file)
            except ImageTooLargeError as exc:
                raise serializers.ValidationError(
                    {"gallery": str(exc)}) from exc
            ProductImage.objects.create(
                product=product,
                image_url=result["secure_url"],
                public_id=result["public_id"],
                order=existing_count,
            )
            existing_count += 1

    # ------------------------------------------------------------------
    # Create / Update
    # ------------------------------------------------------------------

    def create(self, validated_data):
        request = self.context["request"]
        image_file = validated_data.pop("image", None)
        gallery_files = request.FILES.getlist("gallery")

        # Upload primary image if provided
        if image_file:
            result = self._upload_primary(image_file)
            validated_data["image_url"] = result["secure_url"]
            validated_data["image_public_id"] = result["public_id"]

        product = Product.objects.create(**validated_data)

        if gallery_files:
            self._upload_gallery(product, gallery_files)

        return product

    def update(self, instance, validated_data):
        request = self.context["request"]
        image_file = validated_data.pop("image", None)
        gallery_files = request.FILES.getlist("gallery")

        if image_file:
            # Delete old Cloudinary asset before replacing
            from .cloudinary_utils import delete_image
            delete_image(instance.image_public_id)
            result = self._upload_primary(image_file)
            validated_data["image_url"] = result["secure_url"]
            validated_data["image_public_id"] = result["public_id"]

        product = super().update(instance, validated_data)

        if gallery_files:
            self._upload_gallery(product, gallery_files)

        return product


class ProductDetailSerializer(ProductSerializer):
    recent_reviews = serializers.SerializerMethodField()

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ["recent_reviews"]

    @extend_schema_field(ProductReviewSerializer(many=True))
    def get_recent_reviews(self, obj):
        reviews = obj.reviews.select_related("user").all()[:5]
        return ProductReviewSerializer(reviews, many=True).data


# ------------------------------------------------------------------
# Review serializers
# ------------------------------------------------------------------

class ReviewInputSerializer(serializers.Serializer):
    order_item_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    review = serializers.CharField(required=False, allow_blank=True)


class SubmitOrderReviewsSerializer(serializers.Serializer):
    reviews = ReviewInputSerializer(many=True)

    def validate_reviews(self, value):
        if not value:
            raise serializers.ValidationError(
                "At least one review is required.")
        return value

    def create(self, validated_data):
        order = self.context["order"]
        user = self.context["request"].user
        created_reviews = []
        for item_data in validated_data["reviews"]:
            order_item = (
                OrderItem.objects.select_related("product", "order")
                .filter(pk=item_data["order_item_id"], order=order)
                .first()
            )
            if not order_item:
                raise serializers.ValidationError(
                    {"order_item_id":
                        f"Order item {item_data['order_item_id']} is invalid."}
                )

            if order_item.order.user_id != user.id:
                raise serializers.ValidationError(
                    {"detail": "You can only review your own orders."}
                )

            if order_item.order.status != Order.DELIVERED:
                raise serializers.ValidationError(
                    {"detail": "Reviews are allowed after delivery is confirmed."}
                )

            review_obj, _ = ProductReview.objects.update_or_create(
                order_item=order_item,
                defaults={
                    "product": order_item.product,
                    "user": user,
                    "order": order,
                    "rating": item_data["rating"],
                    "review": item_data.get("review", "").strip(),
                },
            )
            created_reviews.append(review_obj)
        return created_reviews
