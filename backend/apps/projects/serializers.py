import json

from rest_framework import serializers

from .models import ChatMessage, Project


class ProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for project listings (no file_map)."""

    message_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "created_at",
            "updated_at",
            "message_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "message_count"]


class ProjectDetailSerializer(serializers.ModelSerializer):
    """Full serializer with file_map for project detail."""

    message_count = serializers.IntegerField(read_only=True)
    file_map_size_kb = serializers.FloatField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "file_map",
            "created_at",
            "updated_at",
            "message_count",
            "file_map_size_kb",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "message_count",
            "file_map_size_kb",
        ]

    def validate_file_map(self, value):
        """Validate file_map size against the user's plan limit."""
        serialized = json.dumps(value)
        size_kb = len(serialized.encode("utf-8")) / 1024

        # Import here to avoid circular imports at module level
        from apps.billing.plans import PLAN_DEFINITIONS

        request = self.context.get("request")
        max_kb = 500  # default
        if request and hasattr(request.user, "plan"):
            plan_type = request.user.plan.plan_type
            max_kb = PLAN_DEFINITIONS.get(plan_type, {}).get(
                "max_file_map_kb", 500
            )

        if size_kb > max_kb:
            raise serializers.ValidationError(
                f"file_map size ({size_kb:.0f} KB) exceeds the limit "
                f"for your plan ({max_kb} KB)."
            )
        return value


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "description"]
        read_only_fields = ["id"]


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "role",
            "content",
            "message_type",
            "usage",
            "raw_code",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
