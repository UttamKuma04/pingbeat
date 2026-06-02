from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.EmailTokenObtainPairView.as_view(), name='login'),
    path('google-login/', views.google_login, name='google_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', TokenBlacklistView.as_view(), name='logout'),
    path('me/', views.me, name='me'),
]
