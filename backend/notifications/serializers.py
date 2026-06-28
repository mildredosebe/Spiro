from rest_framework import serializers
from .models import AdminNotificationRecipient, UserNotification
from django.contrib.auth import get_user_model

User = get_user_model()

class AdminNotificationRecipientSerializer(serializers.ModelSerializer):
    email_display = serializers.CharField(source='recipient_email', read_only=True)
    user_name = serializers.SerializerMethodField(read_only=True)
    user = serializers.SlugRelatedField(
        slug_field='public_id',
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = AdminNotificationRecipient
        fields = ["id", "user", "custom_email", "email_display", "user_name", "created_at"]

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return None

    def validate(self, data):
        user = data.get('user')
        custom_email = data.get('custom_email')

        if not user and not custom_email:
            raise serializers.ValidationError("Either an admin user or a custom email must be provided.")
        
        if user and custom_email:
            raise serializers.ValidationError("Provide either an admin user or a custom email, not both.")
            
        if user and not user.is_staff:
            raise serializers.ValidationError({"user": "Selected user must have staff privileges."})

        # Ensure user uniqueness
        if user and AdminNotificationRecipient.objects.filter(user=user).exists():
            raise serializers.ValidationError({"user": "This user is already a recipient."})

        return data

class UserNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotification
        fields = ["id", "title", "message", "is_read", "created_at"]
        read_only_fields = ["id", "title", "message", "created_at"]
