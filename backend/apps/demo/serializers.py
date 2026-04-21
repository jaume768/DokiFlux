from rest_framework import serializers


class DemoStartSerializer(serializers.Serializer):
    fingerprint = serializers.CharField(max_length=256, required=False, allow_blank=True, default="")
    prompt = serializers.CharField(max_length=5000, required=False, allow_blank=True, default="")
    framework = serializers.ChoiceField(
        choices=["react", "vue", "nextjs"], default="react"
    )

    def validate_framework(self, value):
        # Demo forces react to avoid premium frameworks leaking in.
        return "react"


class DemoGenerateSerializer(serializers.Serializer):
    prompt = serializers.CharField(max_length=5000)


class DemoSessionStateSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    credits_remaining = serializers.DecimalField(max_digits=10, decimal_places=6)
    file_map = serializers.JSONField()
    chat_history = serializers.JSONField()
    framework = serializers.CharField()
    generation_count = serializers.IntegerField()
    migrated = serializers.BooleanField()
