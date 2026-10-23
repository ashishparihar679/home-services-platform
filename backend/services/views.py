from rest_framework import viewsets

from .models import Service
from .permissions import IsAdminUserOrReadOnly
from .serializers import ServiceSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = (IsAdminUserOrReadOnly,)
    http_method_names = ('get', 'post', 'patch', 'head', 'options')

    def get_queryset(self):
        queryset = Service.objects.all()
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            queryset = queryset.filter(is_active=True)
        return queryset
