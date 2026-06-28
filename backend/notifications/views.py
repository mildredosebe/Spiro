from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdminRole
from .models import AdminNotificationRecipient, UserNotification
from .serializers import AdminNotificationRecipientSerializer, UserNotificationSerializer


@extend_schema_view(
    get=extend_schema(summary="List Notification Recipients", description="Admin-only: lists staff/admin users registered to receive notifications."),
    post=extend_schema(summary="Add Notification Recipient", description="Admin-only: registers a user to receive admin notifications."),
)
class AdminNotificationRecipientListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminNotificationRecipientSerializer
    permission_classes = [IsAdminRole]
    queryset = AdminNotificationRecipient.objects.select_related("user").all()


@extend_schema(summary="Remove Notification Recipient", description="Admin-only: removes a user from the admin notification recipient list.")
class AdminNotificationRecipientDeleteView(generics.DestroyAPIView):
    serializer_class = AdminNotificationRecipientSerializer
    permission_classes = [IsAdminRole]
    queryset = AdminNotificationRecipient.objects.all()


@extend_schema(summary="List My Notifications", description="Returns the authenticated user's notifications.")
class UserNotificationListView(generics.ListAPIView):
    serializer_class = UserNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserNotification.objects.filter(user=self.request.user)


@extend_schema(summary="Mark Notification as Read", description="Marks a single notification as read for the authenticated user.")
class UserNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = UserNotification.objects.get(pk=pk, user=request.user)
            notification.is_read = True
            notification.save()
            return Response({"status": "success"})
        except UserNotification.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(summary="Mark All Notifications as Read", description="Marks every unread notification as read for the authenticated user.")
class UserNotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        UserNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"status": "success"})