from django.contrib import admin
from django.urls import path, include
from django.contrib.sitemaps.views import sitemap
from django.http import HttpResponse
from django.views.decorators.http import require_GET

from monitoring.sitemaps import sitemaps

@require_GET
def robots_txt(request):
    """
    Generate dynamic robots.txt containing crawl rules and pointing
    to the canonical dynamic sitemap on the primary domain.
    """
    lines = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /dashboard",
        "Disallow: /monitors/",
        "Disallow: /analytics",
        "Disallow: /apm",
        "Disallow: /incidents",
        "Disallow: /logs",
        "Disallow: /settings",
        "Disallow: /status-pages",
        "Disallow: /login",
        "Disallow: /register",
        "",
        "Sitemap: https://pingbeat.in/sitemap.xml",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('monitoring.urls')),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', robots_txt, name='robots_txt'),
]
