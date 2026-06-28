from django.core.management.base import BaseCommand
from accounts.models import User

class Command(BaseCommand):
    help = "Seed or update the superadmin user for the Spiro platform safely and idempotently"

    def handle(self, *args, **options):
        email_old = "admin@ozzie.local"
        email_new = "admin@spironet.com"
        password_new = "pass@spironet"

        # 1. Update existing spiro admin if it already exists
        try:
            user = User.objects.get(email=email_new)
            self.stdout.write(f"Superadmin {email_new} already exists. Updating password...")
            user.set_password(password_new)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS("Superadmin credentials updated successfully!"))
            return
        except User.DoesNotExist:
            pass

        # 2. Rename and update old admin if it exists in the database
        try:
            user = User.objects.get(email=email_old)
            self.stdout.write(f"Found old admin account {email_old}. Migrating to {email_new} and resetting password...")
            user.email = email_new
            user.set_password(password_new)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS("Superadmin account migrated successfully!"))
            return
        except User.DoesNotExist:
            pass

        # 3. Create a brand-new superadmin if neither exists
        self.stdout.write(f"Creating brand-new superadmin {email_new}...")
        User.objects.create_superuser(
            email=email_new,
            username="admin",
            password=password_new
        )
        self.stdout.write(self.style.SUCCESS("Superadmin created successfully!"))
