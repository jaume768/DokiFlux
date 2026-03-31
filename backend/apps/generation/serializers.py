from rest_framework import serializers

from .providers.registry import VALID_MODEL_IDS, DEFAULT_MODEL


class GenerateRequestSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    prompt = serializers.CharField(max_length=10000)
    chat_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )
    model = serializers.CharField(max_length=50, default=DEFAULT_MODEL, required=False)
    mode = serializers.ChoiceField(choices=["standard", "phased"], default="phased", required=False)
    is_autofix = serializers.BooleanField(default=False, required=False)

    def validate_model(self, value):
        """Ensure model is in the registry."""
        if value not in VALID_MODEL_IDS:
            raise serializers.ValidationError(
                f"Unknown model '{value}'. Valid models: {', '.join(sorted(VALID_MODEL_IDS))}"
            )
        return value

    def validate_chat_history(self, value):
        """Ensure chat_history entries have valid role and content."""
        MAX_CONTENT_LENGTH = 50_000
        for entry in value:
            if "role" not in entry or "content" not in entry:
                raise serializers.ValidationError(
                    "Each chat_history entry must have 'role' and 'content'."
                )
            if entry["role"] not in ("user", "assistant"):
                raise serializers.ValidationError(
                    "chat_history role must be 'user' or 'assistant'."
                )
            if len(entry.get("content", "")) > MAX_CONTENT_LENGTH:
                raise serializers.ValidationError(
                    f"Each chat_history entry content must not exceed {MAX_CONTENT_LENGTH} characters."
                )
        return value


class EstimateRequestSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    prompt = serializers.CharField(max_length=10000)
    chat_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )
