from __future__ import annotations

import random
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone


def _seconds_until_tomorrow() -> int:
    now = timezone.now()
    tomorrow = (now + timedelta(days=1)).replace(hour=0,
                                                 minute=0, second=0, microsecond=0)
    return max(1, int((tomorrow - now).total_seconds()))


def _daily_seed() -> str:
    return f"{timezone.localdate().isoformat()}:{settings.SECRET_KEY}"


def _daily_cache_key() -> str:
    return f"kitas:home:daily_products:{timezone.localdate().isoformat()}"


def _build_daily_ids(queryset) -> list[int]:
    ids = list(queryset.values_list("id", flat=True))
    rng = random.Random(_daily_seed())
    rng.shuffle(ids)
    return ids


def get_daily_products(queryset) -> list:
    cache_key = _daily_cache_key()
    cached_ids = cache.get(cache_key)
    if not cached_ids:
        cached_ids = _build_daily_ids(queryset)
        cache.set(cache_key, cached_ids, timeout=_seconds_until_tomorrow())

    products = list(queryset.filter(id__in=cached_ids))
    product_map = {product.id: product for product in products}
    return [product_map[product_id] for product_id in cached_ids if product_id in product_map]
