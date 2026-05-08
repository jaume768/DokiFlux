from rest_framework import serializers

from .models import ChatMessage, ContactRequest, Project, ProjectAsset


class ProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for project listings (no file_map)."""

    message_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "framework",
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
            "framework",
            "file_map",
            "last_used_model",
            "created_at",
            "updated_at",
            "message_count",
            "file_map_size_kb",
        ]
        read_only_fields = [
            "id",
            "framework",
            "last_used_model",
            "created_at",
            "updated_at",
            "message_count",
            "file_map_size_kb",
        ]

    def validate_file_map(self, value):
        return value


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "description", "framework"]
        read_only_fields = ["id"]


class ProjectAssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAsset
        fields = [
            "id",
            "url",
            "original_name",
            "kind",
            "mime_type",
            "size",
            "width",
            "height",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "url",
            "original_name",
            "mime_type",
            "size",
            "width",
            "height",
            "created_at",
        ]

    def get_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return ""
        url = obj.file.url
        if request and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url

    def validate_kind(self, value):
        return value or "other"

    def validate(self, attrs):
        uploaded = self.context.get("uploaded_file")
        if uploaded:
            allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
            if uploaded.content_type not in allowed_types:
                raise serializers.ValidationError("Formato no permitido. Usa JPG, PNG, WebP o GIF.")
            max_size = 8 * 1024 * 1024
            if uploaded.size > max_size:
                raise serializers.ValidationError("La imagen no puede superar 8 MB.")
        return attrs


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
            "generation_id",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ContactRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactRequest
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "project",
            "project_name",
            "message",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("El nombre es obligatorio.")
        return value

    def validate_message(self, value):
        return (value or "").strip()
