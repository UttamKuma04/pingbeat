from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class RegisterSerializer(serializers.Serializer):
    """Serializer for user registration."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    def validate_email(self, value):
        email = value.strip().lower()
        username_max_length = User._meta.get_field('username').max_length

        if len(email) > username_max_length:
            raise serializers.ValidationError(
                f'Email must be {username_max_length} characters or fewer.'
            )

        if User.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).exists():
            raise serializers.ValidationError('An account with this email already exists.')

        return email

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        validated_data.pop('password2')
        return User.objects.create_user(username=email, email=email, password=password)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login with email while Django continues using username internally."""
    email = serializers.EmailField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)

    def validate(self, attrs):
        email = attrs['email'].strip().lower()
        user = User.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).first()
        username = user.get_username() if user else email
        return super().validate({
            self.username_field: username,
            'password': attrs['password'],
        })


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile data."""
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'date_joined')
