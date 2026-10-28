'use client';

// Reusable storefront navigation header with dynamic branding
import React, { useState } from 'react';
import { Menu, X, Search, CircleUserRound, ShoppingCart } from 'lucide-react';
import { SiteSettings, User } from '@/lib/types';

interface StorefrontHeaderProps {
  settings: SiteSettings;
  view: 'home' | 'shop' | 'product' | 'checkout' | 'confirmation' | 'account' | 'about';
  onNavigate: (view: 'home' | 'shop' | 'product' | 'checkout' | 'confirmation' | 'account' | 'about') => void;
  search: string;
  setSearch: (s: string) => void;
  cartItemCount: number;
  onOpenCart: () => void;
  user: Partial<User> | null;
  selectedCategory: number | null;
  setSelectedCategory: (id: number | null) => void;
}

export function StorefrontHeader({
  settings,
  view,
  onNavigate,
  search,
  setSearch,
  cartItemCount,
  onOpenCart,
  user,
  selectedCategory,
  setSelectedCategory,
}: StorefrontHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div>
      {/* Top operational announcement bar */}
      <div className="bg-[#14212b] px-3 sm:px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e0ee56]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between text-center sm:text-left">
          <span className="flex items-center gap-2">
            {settings.tagline}
          </span>
          <span className="hidden md:inline font-bold">
            Currency: {settings.currency_code} ({settings.currency_symbol})
          </span>
        </div>
      </div>

      {/* Main sticky navigation header */}
      <header className="sticky top-0 z-30 border-b border-[#14212b]/15 bg-[#f5f5f1]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="grid size-9 place-items-center border border-[#14212b]/20 md:hidden cursor-pointer hover:bg-[#14212b] hover:text-[#e0ee56] transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>

            {/* Dynamic brand logo and company title */}
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 text-xl font-black tracking-[-0.08em] cursor-pointer"
            >
              {settings.logo_url && settings.logo_url !== '/favicon.png' ? (
                <img src={settings.logo_url} alt={settings.company_name} className="h-7 w-auto object-contain" />
              ) : settings.company_name ? (
                <span className="grid size-7 place-items-center bg-[#14212b] text-sm text-[#e0ee56] font-black">
                  {settings.company_name.charAt(0)}
                </span>
              ) : null}
              {settings.company_name ? <span className="uppercase">{settings.company_name}</span> : null}
            </button>

            {/* Navigation links */}
            <nav className="hidden items-center gap-6 text-xs font-bold uppercase tracking-[0.13em] md:flex ml-2">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  onNavigate('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={view === 'home' ? 'text-[#9a4e2c]' : 'hover:text-[#9a4e2c] cursor-pointer'}
              >
                Home
              </button>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  onNavigate('shop');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={view === 'shop' && selectedCategory === null ? 'text-[#9a4e2c]' : 'hover:text-[#9a4e2c] cursor-pointer'}
              >
                All Products
              </button>
              <button
                onClick={() => {
                  onNavigate('about');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={view === 'about' ? 'text-[#9a4e2c]' : 'hover:text-[#9a4e2c] cursor-pointer'}
              >
                {settings.company_name ? `About ${settings.company_name}` : 'About'}
              </button>
            </nav>
          </div>

          {/* Catalog search bar */}
          {view === 'shop' && (
            <div className="relative hidden max-w-xs flex-1 md:block">
              <Search className="absolute left-3 top-2.5 size-4 text-[#14212b]/50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands, categories..."
                className="w-full border border-[#14212b]/20 bg-transparent py-2 pl-9 pr-3 text-xs outline-none placeholder:text-[#14212b]/45 focus:border-[#9a4e2c]"
              />
            </div>
          )}

          {/* Account and cart action buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => {
                onNavigate('account');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] hover:text-[#9a4e2c] cursor-pointer p-1"
            >
              <CircleUserRound className="size-4.5" />
              <span className="hidden sm:inline">{user ? user.first_name : 'Account'}</span>
            </button>

            <button
              onClick={onOpenCart}
              className="relative grid size-9 place-items-center border border-[#14212b]/20 hover:bg-[#14212b] hover:text-[#e0ee56] transition-colors cursor-pointer"
              aria-label="View Shopping Bag"
            >
              <ShoppingCart className="size-4" />
              {cartItemCount > 0 && (
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[#e0ee56] text-[#14212b] text-[10px] font-black shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-[#14212b]/15 bg-[#f5f5f1] p-4 md:hidden animate-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col gap-3 text-xs font-bold uppercase tracking-wider">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  onNavigate('home');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1 hover:text-[#9a4e2c]"
              >
                Home
              </button>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  onNavigate('shop');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1 hover:text-[#9a4e2c]"
              >
                All Products
              </button>
              <button
                onClick={() => {
                  onNavigate('about');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1 hover:text-[#9a4e2c]"
              >
                {settings.company_name ? `About ${settings.company_name}` : 'About'}
              </button>
            </nav>
          </div>
        )}
      </header>
    </div>
  );
}
