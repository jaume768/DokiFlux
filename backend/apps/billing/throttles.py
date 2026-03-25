from rest_framework.throttling import UserRateThrottle

from .plans import PLAN_DEFINITIONS


class PlanBasedDailyThrottle(UserRateThrottle):
    """Limits messages/day based on the user's plan."""

    scope = "generation"

    def get_rate(self):
        if not self.request or not hasattr(self.request, "user"):
            return "7/day"

        user = self.request.user
        if not user.is_authenticated:
            return "7/day"

        plan = getattr(user, "plan", None)
        plan_type = plan.plan_type if plan else "free"
        plan_def = PLAN_DEFINITIONS.get(plan_type, PLAN_DEFINITIONS["free"])
        return f"{plan_def['messages_per_day']}/day"
