from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CurrentUserSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class CurrentUserView(APIView):
    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)
