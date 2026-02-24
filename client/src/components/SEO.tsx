import { useEffect } from 'react';
import { useLocation } from 'wouter';

const BASE_URL = 'https://www.spectaeducation.com';
const DEFAULT_OG_IMAGE = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663225686644/JkROfRrqqpCGwfuP.png';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
}

export function SEO({ title, description, keywords, ogImage, canonical, noindex }: SEOProps) {
  const [location] = useLocation();

  useEffect(() => {
    // Set document title
    document.title = title;

    // Helper to set or update meta tag
    const setMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Helper to remove a meta tag
    const removeMetaTag = (name: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      const element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (element) element.remove();
    };

    // Set standard meta tags
    setMetaTag('description', description);
    if (keywords) {
      setMetaTag('keywords', keywords);
    }

    // Set robots meta tag
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }

    // Set Open Graph tags
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:image', ogImage || DEFAULT_OG_IMAGE, true);
    setMetaTag('og:url', canonical || `${BASE_URL}${location}`, true);
    setMetaTag('og:site_name', 'SpecTa Education', true);
    setMetaTag('og:locale', 'en_US', true);

    // Set Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage || DEFAULT_OG_IMAGE);

    // Set canonical URL (always set - either explicit or auto-generated from current path)
    const canonicalUrl = canonical || `${BASE_URL}${location}`;
    let linkElement = document.querySelector('link[rel="canonical"]');
    if (!linkElement) {
      linkElement = document.createElement('link');
      linkElement.setAttribute('rel', 'canonical');
      document.head.appendChild(linkElement);
    }
    linkElement.setAttribute('href', canonicalUrl);

    // Cleanup: remove noindex when component unmounts if it was set
    return () => {
      if (noindex) {
        removeMetaTag('robots');
      }
    };
  }, [title, description, keywords, ogImage, canonical, noindex, location]);

  return null;
}
