from django.urls import path
from .views import (
    AdminNotificationRecipientListCreateView,
    AdminNotificationRecipientDeleteView,
    UserNotificationListView,
    UserNotificationReadView,
    UserNotificationReadAllView
)

urlpatterns = [
    # Admin routes
    path("recipients/", AdminNotificationRecipientListCreateView.as_view(), name="notification-recipients-list"),
    path("recipients/<int:pk>/", AdminNotificationRecipientDeleteView.as_view(), name="notification-recipients-detail"),
    
    # User routes
    path("me/", UserNotificationListView.as_view(), name="user-notifications-list"),
    path("me/<int:pk>/read/", UserNotificationReadView.as_view(), name="user-notifications-read"),
    path("me/read-all/", UserNotificationReadAllView.as_view(), name="user-notifications-read-all"),
]
