import threading
import logging
from django.conf import settings
from django.template.loader import render_to_string
import resend

logger = logging.getLogger(__name__)

# Initialize resend API key from settings
resend.api_key = getattr(settings, 'RESEND_API_KEY', '')

class EmailThread(threading.Thread):
    def __init__(self, subject, to_emails, html_content, idempotency_key=None, from_email=None):
        self.subject = subject
        self.to_emails = to_emails
        self.html_content = html_content
        self.idempotency_key = idempotency_key
        self.from_email = from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', 'Kitas <support@kitas.co.ke>')
        super().__init__()

    def run(self):
        try:
            kwargs = {
                "from": self.from_email,
                "to": self.to_emails,
                "subject": self.subject,
                "html": self.html_content,
            }
            
            if self.idempotency_key:
                kwargs["headers"] = {"Idempotency-Key": self.idempotency_key}

            resend.Emails.send(kwargs)
                
            logger.info(f"Successfully sent email '{self.subject}' to {self.to_emails}")
        except Exception as e:
            logger.error(f"Failed to send email '{self.subject}' to {self.to_emails}: {str(e)}")

def send_welcome_email(user):
    subject = "Welcome to Kitas!"
    context = {'user': user}
    html_content = render_to_string('email/welcome.html', context)
    idempotency_key = f"welcome-email/{user.id}"
    
    EmailThread(subject, [user.email], html_content, idempotency_key).start()

def send_order_success_email(order):
    subject = f"Order Confirmation - {order.id}"
    context = {'order': order}
    html_content = render_to_string('email/order_success.html', context)
    idempotency_key = f"order-success/{order.id}"
    
    EmailThread(subject, [order.user.email], html_content, idempotency_key).start()

def send_admin_order_notification_email(order):
    from .models import AdminNotificationRecipient
    
    # Get all valid recipients (is_staff=True if user is linked, or custom email)
    recipients = AdminNotificationRecipient.objects.select_related('user').all()
    emails_to_send = []
    
    for r in recipients:
        if r.user:
            if r.user.is_staff:
                emails_to_send.append(r.user.email)
        elif r.custom_email:
            emails_to_send.append(r.custom_email)
            
    if not emails_to_send:
        return
        
    subject = f"New Order Received: #{order.id} from {order.user.email}"
    context = {'order': order}
    html_content = render_to_string('notifications/admin_order_notification.html', context)
    idempotency_key = f"admin-order-notification/{order.id}"
    
    EmailThread(
        subject, 
        emails_to_send, 
        html_content, 
        idempotency_key, 
        from_email='"Kitas Admin" <orders@kitas.co.ke>'
    ).start()

def send_order_status_email(order):
    status_display = dict(order.STATUS_CHOICES).get(order.status, order.status)
    subject = f"Update on your Order {order.id}: {status_display}"
    context = {'order': order, 'status_display': status_display}
    html_content = render_to_string('email/order_status_change.html', context)
    idempotency_key = f"order-status/{order.id}/{order.status}"
    
    EmailThread(subject, [order.user.email], html_content, idempotency_key).start()

def send_review_reminder_email(order):
    subject = f"How was your recent purchase? Order {order.id}"
    context = {'order': order}
    html_content = render_to_string('email/review_reminder.html', context)
    idempotency_key = f"review-reminder/{order.id}"
    
    EmailThread(subject, [order.user.email], html_content, idempotency_key).start()

def send_forgot_password_otp_email(user, otp):
    subject = "Reset your Kitas Password"
    context = {'user': user, 'otp': otp}
    html_content = render_to_string('email/forgot_password.html', context)
    idempotency_key = f"forgot-password/{user.id}/{otp}"
    
    EmailThread(subject, [user.email], html_content, idempotency_key).start()
