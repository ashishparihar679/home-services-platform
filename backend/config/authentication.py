from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.serializers import user_role


class RoleAwareTokenObtainPairSerializer(TokenObtainPairSerializer):
    account_type = serializers.ChoiceField(
        choices=("customer", "worker", "admin"),
        required=False,
        write_only=True,
    )

    def validate(self, attrs):
        account_type = attrs.get("account_type")
        if account_type:
            credentials = {
                self.username_field: attrs.get(self.username_field),
                "password": attrs.get("password"),
            }
            user = authenticate(request=self.context.get("request"), **credentials)
            if user is not None and user_role(user) != account_type:
                raise AuthenticationFailed("Selected account type does not match this account.")
        # Keep the existing SimpleJWT token shape and allow legacy clients to omit account_type.
        return super().validate(attrs)
