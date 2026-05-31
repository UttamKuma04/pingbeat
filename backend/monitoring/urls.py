from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('monitors', views.MonitorViewSet, basename='monitor')
router.register('incidents', views.IncidentViewSet, basename='incident')
router.register('status-pages', views.StatusPageViewSet, basename='status-page')
router.register('maintenance-windows', views.MaintenanceWindowViewSet, basename='maintenance-window')
router.register('apm/applications', views.ApplicationViewSet, basename='apm-application')

urlpatterns = [
    path('', include(router.urls)),
    path('logs/', views.MonitorLogListView.as_view(), name='monitor-logs'),
    path('public-status/<slug:slug>/', views.public_status_detail, name='public-status-detail'),
    path('monitors/<int:pk>/badge/', views.monitor_badge, name='monitor-badge'),
    path('analytics/', views.global_analytics, name='global-analytics'),
    path('apm/ingest/', views.apm_ingest, name='apm-ingest'),
    path('apm/analytics/', views.apm_analytics, name='apm-analytics'),
    path('apm/endpoints/', views.apm_endpoints, name='apm-endpoints'),
    path('apm/traffic/', views.apm_traffic, name='apm-traffic'),
    path('apm/errors/', views.apm_errors, name='apm-errors'),
]
