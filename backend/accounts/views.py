from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WorkerProfile
from .permissions import IsCustomer, IsStaffAdmin, IsWorker
from .serializers import (
    CurrentUserSerializer,
    RegisterSerializer,
    WorkerAdminUpdateSerializer,
    WorkerProfileCreateSerializer,
    WorkerProfileSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class CurrentUserView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)


class WorkerApplicationView(APIView):
    permission_classes = (IsCustomer,)

    @transaction.atomic
    def post(self, request):
        serializer = WorkerProfileCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=request.user)
        return Response(WorkerProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class WorkerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = WorkerProfileSerializer
    permission_classes = (IsWorker,)
    http_method_names = ("get", "patch", "head", "options")

    def get_object(self):
        return self.request.user.worker_profile


class AdminWorkerListView(generics.ListAPIView):
    serializer_class = WorkerProfileSerializer
    permission_classes = (IsStaffAdmin,)

    def get_queryset(self):
        queryset = WorkerProfile.objects.select_related("user").all()
        status_filter = self.request.query_params.get("verification_status")
        valid_statuses = {value for value, _label in WorkerProfile.VerificationStatus.choices}
        if status_filter in valid_statuses:
            queryset = queryset.filter(verification_status=status_filter)
        return queryset


class AdminWorkerUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = WorkerAdminUpdateSerializer
    permission_classes = (IsStaffAdmin,)
    http_method_names = ("get", "patch", "head", "options")

    def get_queryset(self):
        return WorkerProfile.objects.select_related("user")
