from django.db import models
from django.conf import settings

class AdminNotificationRecipient(models.Model):
    # If linked to a user, the email will be derived from the user dynamically if needed,
    # but we store a custom email address if user is None.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="admin_notification_settings"
    )
    custom_email = models.EmailField(null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        if self.user:
            return f"Admin: {self.user.email}"
        return f"Custom: {self.custom_email}"

    @property
    def recipient_email(self):
        if self.user:
            return self.user.email
        return self.custom_email

class UserNotification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.title}"
