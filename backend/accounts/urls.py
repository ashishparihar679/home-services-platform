from django.urls import path

from .views import (
    AdminWorkerListView,
    AdminWorkerUpdateView,
    CurrentUserView,
    RegisterView,
    WorkerApplicationView,
    WorkerProfileView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('worker/apply/', WorkerApplicationView.as_view(), name='worker-apply'),
    path('worker/profile/', WorkerProfileView.as_view(), name='worker-profile'),
    path('admin/workers/', AdminWorkerListView.as_view(), name='admin-workers'),
    path('admin/workers/<int:pk>/', AdminWorkerUpdateView.as_view(), name='admin-worker-update'),
]
