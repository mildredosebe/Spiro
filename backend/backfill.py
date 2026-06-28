import os
import django
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils.crypto import get_random_string
from accounts.models import User
from orders.models import Order

for u in User.objects.all():
    u.public_id = uuid.uuid4()
    u.save(update_fields=['public_id'])
    print(f"User {u.id} updated")

for o in Order.objects.all():
    o.order_number = f"KTS-{get_random_string(6, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}"
    o.save(update_fields=['order_number'])
    print(f"Order {o.id} updated")

print("Done")
