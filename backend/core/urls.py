from django.urls import path

from .views import AdminDashboardAnalyticsView

urlpatterns = [
    path("admin/dashboard/analytics/", AdminDashboardAnalyticsView.as_view(), name="admin-dashboard-analytics"),
]
