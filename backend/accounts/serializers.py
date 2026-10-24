from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import WorkerProfile

User = get_user_model()
SERVICE_SKILLS = ("electrician", "plumber", "painter", "cleaner", "carpenter", "other")


def user_role(user):
    if user.is_staff:
        return "admin"
    if hasattr(user, "worker_profile"):
        return "worker"
    return "customer"


class WorkerProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    skills = serializers.ListField(
        child=serializers.ChoiceField(choices=SERVICE_SKILLS),
        allow_empty=False,
    )
    experience_years = serializers.IntegerField(min_value=0, max_value=100)

    class Meta:
        model = WorkerProfile
        fields = (
            "id", "username", "email", "first_name", "last_name", "phone_number",
            "skills", "experience_years", "city", "address", "bio",
            "verification_status", "is_available", "is_active", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "username", "email", "first_name", "last_name",
            "verification_status", "is_active", "created_at", "updated_at",
        )

    def validate_skills(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Choose each skill only once.")
        return value

    def validate_city(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("City is required.")
        return value

    def validate_address(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Address is required.")
        return value

    def validate_phone_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Phone number is required.")
        return value


class WorkerProfileCreateSerializer(serializers.ModelSerializer):
    skills = serializers.ListField(
        child=serializers.ChoiceField(choices=SERVICE_SKILLS),
        allow_empty=False,
    )
    experience_years = serializers.IntegerField(min_value=0, max_value=100, required=False, default=0)

    class Meta:
        model = WorkerProfile
        fields = ("skills", "experience_years", "phone_number", "city", "address", "bio")

    def validate_skills(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Choose each skill only once.")
        return value

    def validate_city(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("City is required.")
        return value

    def validate_address(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Address is required.")
        return value

    def validate_phone_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Phone number is required.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    account_type = serializers.ChoiceField(choices=("customer", "worker"), write_only=True, default="customer")
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=30)
    skills = serializers.ListField(
        child=serializers.ChoiceField(choices=SERVICE_SKILLS), write_only=True, required=False, allow_empty=False
    )
    experience_years = serializers.IntegerField(write_only=True, required=False, min_value=0, max_value=100)
    city = serializers.CharField(write_only=True, required=False, max_length=100)
    address = serializers.CharField(write_only=True, required=False)
    bio = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=500)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name", "password", "account_type",
            "phone_number", "skills", "experience_years", "city", "address", "bio",
        )
        read_only_fields = ("id",)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs.get("account_type") == "worker":
            required = ("skills", "phone_number", "city", "address")
            missing = [field for field in required if not attrs.get(field)]
            if missing:
                raise serializers.ValidationError({field: "This field is required for worker registration." for field in missing})
            if len(attrs["skills"]) != len(set(attrs["skills"])):
                raise serializers.ValidationError({"skills": "Choose each skill only once."})
            for field in ("phone_number", "city", "address"):
                if not attrs[field].strip():
                    raise serializers.ValidationError({field: "This field cannot be blank."})
            attrs["phone_number"] = attrs["phone_number"].strip()
            attrs["city"] = attrs["city"].strip()
            attrs["address"] = attrs["address"].strip()
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        account_type = validated_data.pop("account_type")
        password = validated_data.pop("password")
        worker_fields = {
            name: validated_data.pop(name)
            for name in ("phone_number", "skills", "experience_years", "city", "address", "bio")
            if name in validated_data
        }
        user = User.objects.create_user(password=password, **validated_data)
        if account_type == "worker":
            WorkerProfile.objects.create(user=user, **worker_fields)
        return user


class CurrentUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    worker_profile = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role", "is_superuser", "worker_profile")

    def get_role(self, user):
        return user_role(user)

    def get_worker_profile(self, user):
        if user_role(user) != "worker":
            return None
        return WorkerProfileSummarySerializer(user.worker_profile).data


class WorkerProfileSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerProfile
        fields = ("verification_status", "is_available", "is_active", "skills")


class WorkerAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerProfile
        fields = ("verification_status", "is_active")
