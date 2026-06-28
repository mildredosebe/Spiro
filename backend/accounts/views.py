import string

from django.conf import settings
from django.db.models import Count, Sum, Value, DecimalField
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import get_random_string
from drf_spectacular.utils import extend_schema
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.permissions import IsAdminRole
from notifications.services import send_forgot_password_otp_email

from .models import User, PasswordResetOTP
from .serializers import (
    AdminUserSerializer,
    AdminUserStatusUpdateSerializer,
    GoogleAuthSerializer,
    MeSerializer,
    RegisterSerializer,
    UserSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

OTP_LENGTH = 6
OTP_RESEND_COOLDOWN_SECONDS = 60


def _annotate_user_stats(queryset):
    return queryset.annotate(
        total_orders=Count("orders", distinct=True),
        total_spent=Coalesce(Sum("orders__total_amount"), Value(0, output_field=DecimalField())),
    )


@extend_schema(
    summary="Register",
    description="Creates a new customer account with email and password.",
    tags=["auth"],
)
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


@extend_schema(
    summary="Sign in with Google",
    description=(
        "Verifies a Google ID token and logs the user in. If no account exists for the "
        "verified email, one is created automatically. Returns JWT access/refresh tokens "
        "and the user profile."
    ),
    tags=["auth"],
)
class GoogleAuthView(APIView):
    serializer_class = GoogleAuthSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        client_id = settings.GOOGLE_OAUTH_CLIENT_ID
        if not client_id:
            return Response(
                {"detail": "Google auth is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            google_user = google_id_token.verify_oauth2_token(
                serializer.validated_data["id_token"],
                google_requests.Request(),
                client_id,
                clock_skew_in_seconds=300,  # tolerate up to 5-min server/client clock drift
            )
        except ValueError:
            return Response({"detail": "Invalid Google token."}, status=status.HTTP_400_BAD_REQUEST)

        email = (google_user.get("email") or "").strip().lower()
        if not email or not google_user.get("email_verified"):
            return Response(
                {"detail": "Google account email is not verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            username_base = email.split("@")[0] or "user"
            username = username_base
            suffix = 1
            while User.objects.filter(username=username).exists():
                username = f"{username_base}-{suffix}"
                suffix += 1

            user = User.objects.create_user(
                email=email,
                username=username,
                first_name=google_user.get("given_name", ""),
                last_name=google_user.get("family_name", ""),
                password=get_random_string(32),
            )
        else:
            changed_fields = []
            if not user.first_name and google_user.get("given_name"):
                user.first_name = google_user["given_name"]
                changed_fields.append("first_name")
            if not user.last_name and google_user.get("family_name"):
                user.last_name = google_user["family_name"]
                changed_fields.append("last_name")
            if changed_fields:
                user.save(update_fields=[*changed_fields, "updated_at"])

        if not user.is_active:
            return Response({"detail": "This account is disabled."}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": MeSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    summary="Get or Update My Profile",
    description="Returns the authenticated user's profile on GET, or partially updates it on PATCH/PUT.",
    tags=["auth"],
)
class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return (
            User.objects
            .only(
                "id", "public_id", "email", "username",
                "first_name", "last_name", "phone",
                "addresses", "is_staff", "is_delivery_agent",
            )
            .get(pk=self.request.user.pk)
        )


@extend_schema(
    summary="List Users (Admin)",
    description="Admin-only: lists all users with their total order count and total amount spent.",
    tags=["auth-admin"],
)
class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return _annotate_user_stats(User.objects).order_by("-date_joined")


@extend_schema(
    summary="Update User Status (Admin)",
    description="Admin-only: updates a user's active/staff/delivery-agent flags. Admins cannot deactivate their own account.",
    tags=["auth-admin"],
)
class AdminUserStatusUpdateView(APIView):
    serializer_class = AdminUserStatusUpdateSerializer
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        user = get_object_or_404(User, public_id=pk)

        if request.user.id == user.id:
            return Response({"detail": "You cannot deactivate your own account."}, status=400)

        serializer = AdminUserStatusUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        annotated_user = _annotate_user_stats(User.objects).get(pk=user.pk)
        return Response(AdminUserSerializer(annotated_user).data)


@extend_schema(
    summary="Request Password Reset OTP",
    description=(
        "Sends a 6-digit OTP to the user's email for password reset. Always returns a generic "
        "success response regardless of whether the email exists, to prevent account enumeration. "
        "Limited to one request per minute per account."
    ),
    tags=["auth"],
)
class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        user = User.objects.filter(email__iexact=email).first()
        if user:
            last_otp = PasswordResetOTP.objects.filter(user=user).order_by("-created_at").first()
            if last_otp and (timezone.now() - last_otp.created_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
                return Response(
                    {"detail": "Please wait at least 1 minute before requesting another OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            otp = get_random_string(length=OTP_LENGTH, allowed_chars=string.digits)
            PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)
            PasswordResetOTP.objects.create(user=user, otp=otp)
            send_forgot_password_otp_email(user, otp)

        # Always return a generic success message — do not reveal whether
        # the email exists, to prevent account enumeration.
        return Response(
            {"detail": "If an account with that email exists, an OTP has been sent."},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    summary="Reset Password with OTP",
    description="Verifies the OTP sent to the user's email and sets a new password. The OTP is single-use and expires after a fixed window.",
    tags=["auth"],
)
class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        otp = serializer.validated_data["otp"]
        new_password = serializer.validated_data["new_password"]

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "Invalid email or OTP."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(user=user, otp=otp).order_by("-created_at").first()
        if not otp_record or not otp_record.is_valid():
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        otp_record.is_used = True
        otp_record.save()

        return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)