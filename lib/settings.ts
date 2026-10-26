// Default site brand and operational settings fallback
import { SiteSettings } from './types';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  company_name: 'ShopIt',
  tagline: 'Direct Retail & Wholesale Marketplace for Nigeria',
  logo_url: '/favicon.png',
  support_phone: '+234 800 746 748',
  whatsapp_number: '+234800746748',
  primary_email: 'support@shopit.ng',
  office_address: 'Plot 14B, Commercial Avenue, Ikeja, Lagos State, Nigeria',
  rc_number: 'RC: 1894203',
  currency_symbol: '₦',
  currency_code: 'NGN',
  vat_percent: 7.5,
  socials: {
    twitter: 'https://x.com/shopit_ng',
    instagram: 'https://instagram.com/shopit_ng',
    facebook: 'https://facebook.com/shopit_ng',
    linkedin: 'https://linkedin.com/company/shopit-ng',
    whatsapp: 'https://wa.me/234800746748',
  },
};
