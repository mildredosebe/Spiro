#!/bin/sh
set -e

echo "Checking database connection..."

python << EOF
import os
import sys
import time
import django
from django.db import connections
from django.db.utils import OperationalError

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

for i in range(30):
    try:
        connections["default"].cursor()
        print("Database ready.")
        sys.exit(0)
    except OperationalError:
        print("Waiting for database...")
        time.sleep(2)

print("Database connection failed.")
sys.exit(1)
EOF

if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Applying migrations..."
    python manage.py migrate --noinput

    echo "Collecting static..."
    python manage.py collectstatic --noinput

    echo "Running seeders..."
    python manage.py seed_all || true
fi

exec "$@"