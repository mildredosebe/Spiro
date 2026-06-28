from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run all database seeders in the correct order"

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("=== Kitas DB Seeding Pipeline ==="))

        steps = [
            ("seed_superuser", "Superadmin account"),
            ("seed_fee_rules", "Dynamic fee rules"),
        ]

        for i, (command, label) in enumerate(steps, 1):
            self.stdout.write(f"\n[{i}/{len(steps)}] {label}...")
            call_command(command, verbosity=1)

        self.stdout.write(self.style.SUCCESS("\n=== All seeders completed successfully! ==="))
