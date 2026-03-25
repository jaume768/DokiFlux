from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserPlan
from .services import grant_monthly_credits


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_plan_and_grant(sender, instance, created, **kwargs):
    """On user creation, create a free plan and grant initial credits."""
    if created:
        UserPlan.objects.get_or_create(
            user=instance, defaults={"plan_type": "free"}
        )
        grant_monthly_credits(instance)
