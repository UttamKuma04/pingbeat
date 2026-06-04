from django.contrib.sitemaps import Sitemap
from django.utils import timezone
from .models import StatusPage

class BaseSitemap(Sitemap):
    """
    Base sitemap configuration ensuring all URLs are generated with 
    HTTPS protocol and the canonical pingbeat.in domain.
    """
    protocol = 'https'

    def get_domain(self, site=None):
        return 'pingbeat.in'


class StaticSitemap(BaseSitemap):
    """
    Sitemap for public, static React frontend routes.
    Paths are managed explicitly since the frontend routes are separate from Django views.
    """
    def items(self):
        return ['/', '/about', '/apm/doc']

    def location(self, item):
        return item

    def priority(self, item):
        priorities = {
            '/': 1.0,
            '/about': 0.8,
            '/apm/doc': 0.7
        }
        return priorities.get(item, 0.5)

    def changefreq(self, item):
        freqs = {
            '/': 'weekly',
            '/about': 'monthly',
            '/apm/doc': 'monthly'
        }
        return freqs.get(item, 'weekly')

    def lastmod(self, item):
        # Fallback to current date/time for static pages
        return timezone.now()


class PublicStatusPageSitemap(BaseSitemap):
    """
    Sitemap for dynamically-created public Status Pages.
    Automatically excludes private status pages and uses database updates.
    """
    changefreq = 'daily'
    priority = 0.6

    def items(self):
        return StatusPage.objects.filter(is_public=True).order_by('-created_at')

    def location(self, item):
        return f"/status/{item.slug}"

    def lastmod(self, item):
        return item.created_at


# Sitemap registry to be passed to Django's sitemap view
sitemaps = {
    'static': StaticSitemap,
    'status_pages': PublicStatusPageSitemap,
}
