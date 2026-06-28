from django.contrib.sitemaps import Sitemap
from django.utils import timezone
from .models import StatusPage

class BaseSitemap(Sitemap):
    protocol = 'https'

    def get_domain(self, site=None):
        return 'pingbeat.in'


class StaticSitemap(BaseSitemap):
    def items(self):
        return [
            '/',
            '/about',
            '/apm/doc',
            '/compare',
            '/compare/pingbeat-vs-uptimerobot',
            '/compare/pingbeat-vs-pingdom',
            '/compare/pingbeat-vs-better-stack',
            '/compare/pingbeat-vs-statuscake',
            '/compare/pingbeat-vs-site24x7',
            '/compare/pingbeat-vs-checkly',
            '/compare/pingbeat-vs-freshping',
            '/compare/pingbeat-vs-hyperping',
            '/compare/pingbeat-vs-signoz',
            '/compare/pingbeat-vs-sentry',
            '/compare/pingbeat-vs-netdata',
            '/compare/pingbeat-vs-datadog',
        ]

    def location(self, item):
        return item

    def priority(self, item):
        if item == '/':
            return 1.0
        if item.startswith('/compare/pingbeat-vs-'):
            return 0.9
        priorities = {
            '/about': 0.8,
            '/apm/doc': 0.7,
            '/compare': 0.8,
        }
        return priorities.get(item, 0.5)

    def changefreq(self, item):
        if item.startswith('/compare/'):
            return 'weekly'
        freqs = {
            '/': 'weekly',
            '/about': 'monthly',
            '/apm/doc': 'monthly',
        }
        return freqs.get(item, 'weekly')

    def lastmod(self, item):
        return timezone.now()


class PublicStatusPageSitemap(BaseSitemap):
    changefreq = 'daily'
    priority = 0.6

    def items(self):
        return StatusPage.objects.filter(is_public=True).order_by('-created_at')

    def location(self, item):
        return f"/status/{item.slug}"

    def lastmod(self, item):
        return item.created_at


sitemaps = {
    'static': StaticSitemap,
    'status_pages': PublicStatusPageSitemap,
}
