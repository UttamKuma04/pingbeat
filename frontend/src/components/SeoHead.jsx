import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_TITLE = 'PingBEAT — Self-Hosted Uptime Monitoring, APM & Status Pages | 30s Checks';
const DEFAULT_DESC = 'PingBEAT is a self-hosted uptime monitoring, APM, alerting, and status page platform with 30-second checks, SSL tracking, incident history, and SVG uptime badges.';
const DEFAULT_CANONICAL = 'https://pingbeat.in';
const DEFAULT_OG_IMAGE = 'https://pingbeat.in/logo.svg';
const DEFAULT_ROBOTS = 'index, follow';

const setMetaTag = (attrName, attrVal, content) => {
  if (content === undefined || content === null) return;
  let element = document.querySelector(`meta[${attrName}="${attrVal}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrVal);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const removeMetaTag = (attrName, attrVal) => {
  const element = document.querySelector(`meta[${attrName}="${attrVal}"]`);
  if (element) element.remove();
};

const setLinkTag = (rel, href) => {
  if (!href) return;
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

const setJsonLd = (id, data) => {
  let element = document.getElementById(id);
  if (data) {
    if (!element) {
      element = document.createElement('script');
      element.setAttribute('type', 'application/ld+json');
      element.setAttribute('id', id);
      document.head.appendChild(element);
    }
    element.textContent = JSON.stringify(data);
  } else if (element) {
    element.remove();
  }
};

export default function SeoHead({
  title,
  description,
  canonical,
  robots,
  ogType = 'website',
  ogImage,
  jsonLd,
  keywords,
}) {
  const location = useLocation();

  useEffect(() => {
    // Determine values
    const currentTitle = title || DEFAULT_TITLE;
    const currentDesc = description || DEFAULT_DESC;
    const currentCanonical = canonical || `${DEFAULT_CANONICAL}${location.pathname === '/' ? '' : location.pathname}`;
    const currentRobots = robots || DEFAULT_ROBOTS;
    const currentOgImage = ogImage || DEFAULT_OG_IMAGE;

    // Apply values
    document.title = currentTitle;

    setMetaTag('name', 'description', currentDesc);
    setMetaTag('name', 'robots', currentRobots);

    // Keywords — only set when provided by the page
    if (keywords) {
      setMetaTag('name', 'keywords', keywords);
    }

    // Open Graph
    setMetaTag('property', 'og:title', currentTitle);
    setMetaTag('property', 'og:description', currentDesc);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', currentCanonical);
    setMetaTag('property', 'og:image', currentOgImage);
    setMetaTag('property', 'og:site_name', 'PingBEAT');

    // Twitter
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', currentTitle);
    setMetaTag('name', 'twitter:description', currentDesc);
    setMetaTag('name', 'twitter:image', currentOgImage);

    // Canonical link
    setLinkTag('canonical', currentCanonical);

    // Structured Data (JSON-LD)
    if (jsonLd) {
      setJsonLd('seo-jsonld-schema', jsonLd);
    } else {
      setJsonLd('seo-jsonld-schema', null);
    }

    // Cleanup on unmount — restore defaults
    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag('name', 'description', DEFAULT_DESC);
      setMetaTag('name', 'robots', DEFAULT_ROBOTS);
      setMetaTag('property', 'og:title', DEFAULT_TITLE);
      setMetaTag('property', 'og:description', DEFAULT_DESC);
      setMetaTag('property', 'og:type', 'website');
      setMetaTag('property', 'og:url', DEFAULT_CANONICAL);
      setMetaTag('property', 'og:image', DEFAULT_OG_IMAGE);
      setMetaTag('name', 'twitter:title', DEFAULT_TITLE);
      setMetaTag('name', 'twitter:description', DEFAULT_DESC);
      setMetaTag('name', 'twitter:image', DEFAULT_OG_IMAGE);
      setLinkTag('canonical', DEFAULT_CANONICAL);
      setJsonLd('seo-jsonld-schema', null);
      // Remove keywords tag on unmount if it was injected
      if (keywords) {
        removeMetaTag('name', 'keywords');
      }
    };
  }, [title, description, canonical, robots, ogType, ogImage, jsonLd, keywords, location.pathname]);

  return null; // This component doesn't render any visible UI
}
