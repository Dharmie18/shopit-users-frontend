// Default site brand and operational settings fallback
import { SiteSettings } from './types';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  company_name: '',
  tagline: '',
  logo_url: '',
  support_phone: '',
  whatsapp_number: '',
  primary_email: '',
  office_address: '',
  rc_number: '',
  currency_symbol: '₦',
  currency_code: 'NGN',
  vat_percent: 7.5,
  socials: {
    twitter: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    whatsapp: '',
  },
};
