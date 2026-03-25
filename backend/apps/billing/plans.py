"""
Plan definitions as code. Simple for MVP, migrable to DB + admin when Stripe
is integrated.
"""

from decimal import Decimal

PLAN_DEFINITIONS = {
    "free": {
        "price_monthly": Decimal("0"),
        "monthly_credits": Decimal("5.00"),
        "messages_per_day": 7,
        "show_badge": True,
        "max_file_map_kb": 200,
    },
    "premium": {
        "price_monthly": Decimal("20"),
        "monthly_credits": Decimal("20.00"),
        "messages_per_day": 100,
        "show_badge": False,
        "max_file_map_kb": 500,
    },
}

# Credit expiry durations (in days)
MONTHLY_GRANT_EXPIRY_DAYS = 65
PURCHASE_GRANT_EXPIRY_DAYS = 365
