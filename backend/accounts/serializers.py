from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='public_id', read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "username", "first_name", "last_name", "phone", "addresses", "is_staff", "is_delivery_agent"]


class AddressSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_blank=True, max_length=64)
    label = serializers.CharField(required=False, allow_blank=True, max_length=80)
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=32)
    address = serializers.CharField(max_length=255)
    city = serializers.CharField(required=False, allow_blank=True, max_length=80)
    postal_code = serializers.CharField(required=False, allow_blank=True, max_length=20)


class MeSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='public_id', read_only=True)
    addresses = serializers.ListField(child=serializers.DictField(), required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "phone",
            "addresses",
            "is_staff",
            "is_delivery_agent",
        ]
        read_only_fields = ["id", "email", "username", "is_staff", "is_delivery_agent"]

    def validate_addresses(self, value):
        normalized = []
        for item in value:
            serializer = AddressSerializer(data=item)
            serializer.is_valid(raise_exception=True)
            payload = serializer.validated_data
            payload["full_name"] = payload.get("full_name", "").strip()
            payload["phone"] = payload.get("phone", "").strip()
            payload["address"] = payload.get("address", "").strip()
            payload["city"] = payload.get("city", "").strip()
            payload["postal_code"] = payload.get("postal_code", "").strip()

            if not payload["full_name"]:
                raise serializers.ValidationError("Address full_name is required.")
            if not payload["phone"]:
                raise serializers.ValidationError("Address phone is required.")
            if not payload["address"]:
                raise serializers.ValidationError("Address address is required.")

            normalized.append(payload)
        return normalized


class AdminUserSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='public_id', read_only=True)
    total_orders = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "phone",
            "is_active",
            "is_staff",
            "is_delivery_agent",
            "date_joined",
            "total_orders",
            "total_spent",
        ]


class AdminUserStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["is_active", "is_staff", "is_delivery_agent"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "password", "username", "first_name", "last_name", "phone"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        username = validated_data.get("username") or validated_data["email"].split("@")[0]
        validated_data["username"] = username
        return User.objects.create_user(password=password, **validated_data)


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(min_length=8)
