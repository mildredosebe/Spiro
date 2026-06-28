from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta

from .managers import UserManager


import uuid

class User(AbstractUser):
	public_id = models.UUIDField(default=uuid.uuid4, editable=False, null=True, unique=True)
	username = models.CharField(max_length=150, blank=True)
	email = models.EmailField(unique=True)
	phone = models.CharField(max_length=32, blank=True)
	addresses = models.JSONField(default=list, blank=True)
	is_delivery_agent = models.BooleanField(default=False)

	USERNAME_FIELD = "email"
	REQUIRED_FIELDS = ["username"]

	objects = UserManager()

	def __str__(self):
		return self.email

def default_expiration():
    return timezone.now() + timedelta(minutes=10)

class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_otps')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_expiration)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"OTP for {self.user.email} (used: {self.is_used})"
