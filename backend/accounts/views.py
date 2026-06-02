import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import EmailTokenObtainPairSerializer, RegisterSerializer, UserSerializer
from .tasks import send_registration_confirmation_email


class EmailTokenObtainPairView(TokenObtainPairView):
    """JWT login endpoint that accepts an email field."""
    serializer_class = EmailTokenObtainPairSerializer


def _auth_payload_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'user': UserSerializer(user).data,
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    }


def _queue_registration_confirmation_email(user):
    """Queue confirmation email delivery through Redis/Celery."""
    try:
        send_registration_confirmation_email.delay(user.id)
    except Exception as exc:
        print(f"Registration confirmation email could not be queued for {user.email}: {exc}")


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user and return JWT tokens."""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        _queue_registration_confirmation_email(user)
        return Response(_auth_payload_for_user(user), status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """Validate a Google ID token and return JWT tokens."""
    credential = request.data.get('credential')

    if not credential:
        return Response({'detail': 'Google credential is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        google_response = requests.get(
            'https://oauth2.googleapis.com/tokeninfo',
            params={'id_token': credential},
            timeout=5,
        )
    except requests.RequestException:
        return Response(
            {'detail': 'Unable to verify Google credential. Please try again.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if google_response.status_code != 200:
        return Response({'detail': 'Invalid Google credential.'}, status=status.HTTP_400_BAD_REQUEST)

    payload = google_response.json()
    if payload.get('aud') != settings.GOOGLE_CLIENT_ID:
        return Response({'detail': 'Google credential is not for this application.'}, status=status.HTTP_400_BAD_REQUEST)

    if str(payload.get('email_verified')).lower() != 'true':
        return Response({'detail': 'Google email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)

    email = (payload.get('email') or '').strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return Response({'detail': 'Google account did not return a valid email.'}, status=status.HTTP_400_BAD_REQUEST)

    username_max_length = User._meta.get_field('username').max_length
    if len(email) > username_max_length:
        return Response(
            {'detail': f'Email must be {username_max_length} characters or fewer.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).first()
    created = False
    if user is None:
        user = User.objects.create_user(username=email, email=email)
        created = True
    elif user.email != email:
        user.email = email
        user.save(update_fields=['email'])

    if created:
        _queue_registration_confirmation_email(user)

    return Response(_auth_payload_for_user(user), status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Return the current authenticated user's profile."""
    return Response(UserSerializer(request.user).data)
