from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from orders.models import Order
from .services import (
    send_welcome_email,
    send_order_success_email,
    send_order_status_email,
    send_review_reminder_email,
    send_admin_order_notification_email
)

User = get_user_model()

@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    if created and instance.email:
        send_welcome_email(instance)


@receiver(pre_save, sender=Order)
def order_pre_save(sender, instance, **kwargs):
    if not instance.pk:
        return
        
    try:
        old_instance = Order.objects.get(pk=instance.pk)
    except Order.DoesNotExist:
        return
        
    # Detect payment status change to PAID
    if old_instance.payment_status != instance.payment_status and instance.payment_status == Order.PAYMENT_PAID:
        # We attach a flag to send the email in post_save after it's committed
        instance._send_success_email = True

    # Detect status change
    if old_instance.status != instance.status:
        instance._status_changed_to = instance.status


from notifications.models import UserNotification

@receiver(post_save, sender=Order)
def order_post_save(sender, instance, created, **kwargs):
    # Helper to format items
    def get_order_items_text(order):
        items = order.items.all()
        if not items:
            return ""
        item_names = [f"{i.product.name} (x{i.quantity})" for i in items]
        if len(item_names) > 2:
            return f"{item_names[0]}, {item_names[1]} and {len(item_names)-2} more"
        return ", ".join(item_names)

    if getattr(instance, '_send_success_email', False):
        send_order_success_email(instance)
        send_admin_order_notification_email(instance)
        instance._send_success_email = False
        
        items_text = get_order_items_text(instance)
        items_msg = f" containing {items_text}" if items_text else ""
        
        # Create an in-app notification for the customer
        UserNotification.objects.create(
            user=instance.user,
            title="Order Confirmed! 🎉",
            message=f"Your order #{instance.id}{items_msg} has been placed successfully and is being processed."
        )

        # Notify all admins to take action
        admin_users = User.objects.filter(is_staff=True)
        admin_notifications = [
            UserNotification(
                user=admin,
                title="New Order Received! 🛍️",
                message=f"Order #{instance.id} for {instance.total_amount} KSh{items_msg} has been placed. Please review and process it."
            )
            for admin in admin_users
        ]
        if admin_notifications:
            UserNotification.objects.bulk_create(admin_notifications)
        
    status_changed_to = getattr(instance, '_status_changed_to', None)
    if status_changed_to:
        items_text = get_order_items_text(instance)
        items_msg = f" ({items_text})" if items_text else ""

        if status_changed_to in [Order.SHIPPED, Order.DELIVERED_PENDING, Order.CANCELLED]:
            if status_changed_to in [Order.SHIPPED, Order.CANCELLED]:
                send_order_status_email(instance)
            
            status_text = dict(Order.STATUS_CHOICES).get(status_changed_to, status_changed_to)
            title = f"Order Update: {status_text}"
            
            if status_changed_to == Order.DELIVERED_PENDING:
                message = f"The delivery agent has marked your order #{instance.id}{items_msg} as delivered. Please confirm receipt to complete the order."
            else:
                message = f"The status of your order #{instance.id}{items_msg} has changed to {status_text}."

            UserNotification.objects.create(
                user=instance.user,
                title=title,
                message=message
            )
            
        elif status_changed_to == Order.DELIVERED:
            send_order_status_email(instance)
            send_review_reminder_email(instance)
            
            UserNotification.objects.create(
                user=instance.user,
                title="Order Delivered! 📦",
                message=f"Your order #{instance.id}{items_msg} has been delivered. Enjoy!"
            )
        
        instance._status_changed_to = None
