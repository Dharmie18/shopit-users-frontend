'use client';

import React, { useState } from 'react';
import { Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { Category, SiteSettings } from '@/lib/types';

interface StorefrontFooterProps {
  settings: SiteSettings;
  categories: Category[];
  onSelectCategory: (id: number) => void;
  onNavigate: (view: 'home' | 'shop' | 'product' | 'checkout' | 'confirmation' | 'account' | 'about') => void;
  onNewsletterSubmit: (e: React.FormEvent, email: string, resetFn: () => void) => void;
  newsletterLoading: boolean;
}

export function StorefrontFooter({
  settings,
  categories,
  onSelectCategory,
  onNavigate,
  onNewsletterSubmit,
  newsletterLoading,
}: StorefrontFooterProps) {
  const [email, setEmail] = useState('');

  return (
    <footer className="mt-20 border-t border-[#14212b]/15 bg-[#14212b] text-[#f5f5f1]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-14 lg:py-18">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand profile and corporate contacts */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2.5 text-xl font-black tracking-tight">
              {settings.logo_url && settings.logo_url !== '/favicon.png' ? (
                <img src={settings.logo_url} alt={settings.company_name} className="h-7 w-auto object-contain" />
              ) : (
                <span className="grid size-7 place-items-center bg-[#e0ee56] text-sm text-[#14212b] font-black">
                  {settings.company_name ? settings.company_name.charAt(0) : 'S'}
                </span>
              )}
              <span className="uppercase">{settings.company_name} COMMERCE</span>
            </div>

            <p className="text-xs text-white/60 leading-relaxed max-w-sm">
              {settings.tagline}
            </p>

            <div className="pt-2 text-xs text-white/40 space-y-1 font-mono">
              <p>RC Number: {settings.rc_number}</p>
              <p>Location: {settings.office_address}</p>
              <p>Support: {settings.primary_email}</p>
              <p>Hotline: {settings.support_phone}</p>
            </div>

            {/* Dynamic social links */}
            <div className="pt-2 flex items-center gap-3 text-xs text-[#e0ee56]">
              {settings.socials.twitter && (
                <a href={settings.socials.twitter} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Twitter / X
                </a>
              )}
              {settings.socials.instagram && (
                <a href={settings.socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Instagram
                </a>
              )}
              {settings.socials.linkedin && (
                <a href={settings.socials.linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  LinkedIn
                </a>
              )}
              {settings.socials.whatsapp && (
                <a href={settings.socials.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Product category shortcuts */}
          <div className="lg:col-span-3 space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#e0ee56]">Categories</p>
            <ul className="space-y-2 text-xs text-white/70">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.category_id}>
                  <button
                    onClick={() => {
                      onSelectCategory(cat.category_id);
                      onNavigate('shop');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-[#e0ee56] transition-colors cursor-pointer text-left"
                  >
                    {cat.category_name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer service links */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#e0ee56]">Customer Service</p>
            <ul className="space-y-2 text-xs text-white/70">
              <li>
                <button onClick={() => onNavigate('account')} className="hover:text-[#e0ee56] cursor-pointer">
                  My Account
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory(0);
                    onNavigate('shop');
                  }}
                  className="hover:text-[#e0ee56] cursor-pointer"
                >
                  Catalog Inventory
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#e0ee56] cursor-pointer"
                >
                  About {settings.company_name}
                </button>
              </li>
              <li><span className="text-white/40">Delivery &amp; Returns</span></li>
              <li><span className="text-white/40">Privacy Policy</span></li>
            </ul>
          </div>

          {/* Trade newsletter subscription box */}
          <div className="lg:col-span-3 border border-white/10 bg-white/5 p-5 rounded-xs space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e0ee56] flex items-center gap-2">
                <Mail className="size-4" /> Newsletter
              </p>
              <h4 className="mt-1 text-sm font-black text-white">Get Weekly Offers</h4>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                Subscribe to receive discount alerts, new product arrivals, and special promotions.
              </p>
            </div>

            <form onSubmit={(e) => onNewsletterSubmit(e, email, () => setEmail(''))} className="flex flex-col gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="border border-white/20 bg-[#14212b] px-3 py-2 text-xs text-white outline-none focus:border-[#e0ee56] placeholder:text-white/40"
              />
              <button
                disabled={newsletterLoading}
                className="bg-[#e0ee56] text-[#14212b] px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-[#d4e24a] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {newsletterLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  'Subscribe'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Legal attribution and currency footer bar */}
      <div className="border-t border-white/10 bg-[#0d161d] px-4 sm:px-6 py-5 text-xs text-white/50">
        <div className="mx-auto flex max-w-[1440px] flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-center sm:text-left">
            <span>© {new Date().getFullYear()} {settings.company_name} Commerce Ltd. All rights reserved.</span>
            <span className="hidden sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5 bg-[#14212b] border border-white/10 px-2 py-0.5 text-[10px] font-bold text-[#e0ee56]">
              Currency: {settings.currency_code} ({settings.currency_symbol})
            </span>
          </div>

          <div className="flex items-center gap-2 text-white/60 text-[11px]">
            <ShieldCheck className="size-4 text-[#e0ee56]" />
            <span>Verified Secure 256-Bit Encrypted Checkout</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
