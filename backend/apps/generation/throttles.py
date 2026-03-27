"""
Async-compatible daily generation throttle backed by Redis.
Used by generate_view (raw async Django view) where DRF throttling doesn't apply.
"""
from datetime import date

from asgiref.sync import sync_to_async
from django_redis import get_redis_connection


async def check_daily_generate_limit(user_id: int, limit: int) -> bool:
    """
    Returns True if the user has exceeded their daily generation limit.
    Increments the counter on each call; sets a 24-hour TTL on first use.
    """
    redis = get_redis_connection("default")
    key = f"throttle:gen:{user_id}:{date.today().isoformat()}"

    count = await sync_to_async(redis.incr)(key)
    if count == 1:
        await sync_to_async(redis.expire)(key, 86400)

    return count > limit
