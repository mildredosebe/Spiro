from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
	fieldsets = DjangoUserAdmin.fieldsets + (("Extra", {"fields": ("phone", "is_delivery_agent")}),)
	list_display = ("id", "email", "username", "is_staff", "is_delivery_agent", "is_active")
	ordering = ("id",)
