from rest_framework import serializers


class GenerateRequestSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    prompt = serializers.CharField(max_length=10000)
    chat_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )
    model = serializers.CharField(max_length=50, default="gpt-5.4", required=False)

    def validate_chat_history(self, value):
        """Ensure chat_history entries have valid role and content."""
        for entry in value:
            if "role" not in entry or "content" not in entry:
                raise serializers.ValidationError(
                    "Each chat_history entry must have 'role' and 'content'."
                )
            if entry["role"] not in ("user", "assistant"):
                raise serializers.ValidationError(
                    "chat_history role must be 'user' or 'assistant'."
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
