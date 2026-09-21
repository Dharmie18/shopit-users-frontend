'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Award,
  MapPin,
  Users2,
  HeartHandshake,
  ChevronDown,
  SlidersHorizontal,
  Check,
  ChevronLeft,
  CircleUserRound,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
  AlertCircle,
  Package,
  RefreshCw,
  LogOut,
  Menu,
  Mail,
  ShieldCheck,
  Truck,
  Zap,
  Building2,
  CheckCircle2,
  Quote,
  Loader2,
  Gift,
  Copy,
  Tag,
  Percent,
  Share2,
  CheckCheck,
  Ticket,
  Sparkles,
  Clock,
  Timer,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { saveAuth, getAuthUser, clearAuth, isAuthenticated } from '@/lib/auth';
import { Product, Category, Order, CartLine, User, PlatformStats, Coupon, ReferralData } from '@/lib/types';
import { money, sleep } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type View = 'home' | 'shop' | 'product' | 'checkout' | 'confirmation' | 'account' | 'about';

function formatCouponExpiry(expiresAt?: string, isUsed?: number | boolean, isExpired?: boolean) {
  if (Number(isUsed) === 1 || isUsed === true) {
    return { text: 'Redeemed', expired: false, urgent: false };
  }
  if (!expiresAt) {
    return { text: '7 Days', expired: false, urgent: false };
  }
  const expiryTime = new Date(expiresAt.replace(' ', 'T')).getTime();
  const now = Date.now();
  const diffMs = expiryTime - now;

  if (diffMs <= 0 || isExpired) {
    return { text: 'Expired', expired: true, urgent: false };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { text: `${days}d ${hours}h left`, expired: false, urgent: days <= 1 };
  }
  if (hours > 0) {
    return { text: `${hours}h ${mins}m left`, expired: false, urgent: true };
  }
  return { text: `${mins}m left`, expired: false, urgent: true };
}

export default function Page() {
  const [view, setView] = useState<View>('home');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(true);

  // Async Isolated States
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Auth & Account State
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [accountMode, setAccountMode] = useState<'login' | 'register' | 'verify_notice'>('login');
  const [authForm, setAuthForm] = useState({ first_name: '', last_name: '', email: '', password: '', referral_code: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');


  // Referral & Coupon State
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // User Orders
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Checkout State
  const [checkoutForm, setCheckoutForm] = useState({ shipping_address: '', payment_method: 'Bank Transfer' });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [lastOrderResult, setLastOrderResult] = useState<{ order_id: string | number; total_amount: number | string } | null>(null);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterMsg, setNewsletterMsg] = useState('');

  useEffect(() => {
    loadInitialData();

    // 1. Initialize local cart from localStorage
    let savedLocalCart: CartLine[] = [];
    if (typeof window !== 'undefined') {
      try {
        const storedCart = localStorage.getItem('shopit_cart');
        if (storedCart) {
          const parsed = JSON.parse(storedCart);
          if (Array.isArray(parsed) && parsed.length > 0) {
            savedLocalCart = parsed;
            setCart(parsed);
          }
        }
      } catch {
        // ignore storage error
      }
      setCartLoaded(true);

      // Check for referral code or magic email verification token in query params
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        try {
          localStorage.setItem('shopit_ref_code', cleanRef);
        } catch {
          // localStorage disabled fallback
        }
        setAuthForm((prev) => ({ ...prev, referral_code: cleanRef }));
        notify(`Referral code ${cleanRef} applied! Create an account to receive 20% OFF.`);
      } else {
        try {
          const storedRef = localStorage.getItem('shopit_ref_code');
          if (storedRef) {
            setAuthForm((prev) => ({ ...prev, referral_code: storedRef }));
          }
        } catch {
          // ignore
        }
      }

      // Check for magic email verification link ?verify_token=...
      const verifyToken = params.get('verify_token') || params.get('token');
      if (verifyToken) {
        apiRequest('/api/users/verify-email.php', 'POST', { token: verifyToken })
          .then((res: any) => {
            if (res.token) {
              saveAuth(res.token, {
                user_id: res.user_id,
                first_name: res.first_name,
                last_name: res.last_name,
                email: res.email,
                role: res.role,
                is_verified: true,
              });
              setUser({
                user_id: res.user_id,
                first_name: res.first_name,
                last_name: res.last_name,
                email: res.email,
                role: res.role,
                is_verified: true,
              });
              notify('🎉 Email verified successfully! Welcome to ShopIt.');
              setView('account');
              loadUserProfile();
              loadUserOrders();
              loadReferralData();
              loadUserCart(savedLocalCart);
            }
          })
          .catch((err: any) => {
            notify(err.message || 'Verification link is invalid or already activated.');
          })
          .finally(() => {
            // Remove token from browser address bar
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          });
      }
    }

    if (isAuthenticated()) {
      setUser(getAuthUser());
      loadUserProfile();
      loadUserOrders();
      loadReferralData();
      loadUserCart(savedLocalCart);
    }
  }, []);

  // Sync Cart to LocalStorage and Backend Database (Debounced)
  useEffect(() => {
    if (!cartLoaded) return;

    try {
      if (cart.length > 0) {
        localStorage.setItem('shopit_cart', JSON.stringify(cart));
      } else {
        localStorage.removeItem('shopit_cart');
      }
    } catch {
      // ignore
    }

    if (isAuthenticated()) {
      const timer = setTimeout(() => {
        const itemsToSend = cart.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
        }));
        apiRequest('/api/cart/cart.php', 'POST', { items: itemsToSend, mode: 'replace' }, true).catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [cart, cartLoaded]);


  useEffect(() => {
    function updateScrollControl() {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
      setShowScrollDown(!atBottom);
    }

    updateScrollControl();
    window.addEventListener('scroll', updateScrollControl, { passive: true });
    window.addEventListener('resize', updateScrollControl);
    return () => {
      window.removeEventListener('scroll', updateScrollControl);
      window.removeEventListener('resize', updateScrollControl);
    };
  }, []);

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError('');
    const startTime = Date.now();
    try {
      const prodData = await apiRequest<Product[]>('/api/products/products.php');
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await sleep(800 - elapsed);
      }
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await sleep(800 - elapsed);
      }
      setProductsError(err.message || 'Unable to connect to product catalog.');
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadCategories() {
    setCategoriesLoading(true);
    const startTime = Date.now();
    try {
      const catData = await apiRequest<Category[]>('/api/categories/categories.php');
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await sleep(600 - elapsed);
      }
      setCategories(Array.isArray(catData) ? catData : []);
    } catch {
      // Keep default/empty categories gracefully
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function loadStats() {
    try {
      const statsData = await apiRequest<PlatformStats>('/api/stats/overview.php');
      if (statsData) setStats(statsData);
    } catch {
      // Keep default stats gracefully
    }
  }

  function loadInitialData() {
    loadProducts();
    loadCategories();
    loadStats();
  }

  async function loadUserProfile() {
    try {
      const profile = await apiRequest<User>('/api/users/profile.php', 'GET', undefined, true);
      setUser(profile);
    } catch {
      clearAuth();
      setUser(null);
    }
  }

  async function loadUserOrders() {
    setOrdersLoading(true);
    const startTime = Date.now();
    try {
      const orders = await apiRequest<Order[]>('/api/users/orders.php', 'GET', undefined, true);
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await sleep(600 - elapsed);
      }
      setUserOrders(Array.isArray(orders) ? orders : []);
    } catch {
      setUserOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadReferralData() {
    if (!isAuthenticated()) return;
    setReferralLoading(true);
    try {
      const data = await apiRequest<ReferralData>('/api/referrals/my-referrals.php', 'GET', undefined, true);
      if (data) {
        setReferralData(data);
      }
    } catch {
      // Ignore fallback
    } finally {
      setReferralLoading(false);
    }
  }

  async function loadUserCart(guestCartToMerge?: CartLine[]) {
    if (!isAuthenticated()) return;
    try {
      if (guestCartToMerge && guestCartToMerge.length > 0) {
        const itemsToSend = guestCartToMerge.map((l) => ({
          product_id: l.product_id,
          quantity: l.quantity,
        }));
        const res = await apiRequest<{ message: string; cart: CartLine[] }>(
          '/api/cart/cart.php',
          'POST',
          { items: itemsToSend, mode: 'merge' },
          true
        );
        if (res && Array.isArray(res.cart)) {
          setCart(res.cart);
          try {
            localStorage.setItem('shopit_cart', JSON.stringify(res.cart));
          } catch {}
        }
      } else {
        const res = await apiRequest<{ cart: CartLine[] }>('/api/cart/cart.php', 'GET', undefined, true);
        if (res && Array.isArray(res.cart)) {
          setCart(res.cart);
          try {
            if (res.cart.length > 0) {
              localStorage.setItem('shopit_cart', JSON.stringify(res.cart));
            }
          } catch {}
        }
      }
    } catch {
      // ignore fallback
    }
  }

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  }

  function openProduct(p: Product) {
    setSelectedProduct(p);
    setView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addToCart(product: Product, quantity = 1) {
    if (product.stock_quantity <= 0) {
      notify('This item is currently out of stock.');
      return;
    }
    setCart((current) => {
      const existing = current.find((l) => l.product_id === product.product_id);
      if (existing) {
        const newQty = Math.min(product.stock_quantity, existing.quantity + quantity);
        return current.map((l) => (l.product_id === product.product_id ? { ...l, quantity: newQty } : l));
      }
      return [...current, { product_id: product.product_id, product, quantity: Math.min(product.stock_quantity, quantity) }];
    });
    notify(product.product_name + ' added to your shopping bag.');
  }

  function updateQuantity(id: number, delta: number) {
    setCart((current) =>
      current
        .map((l) => {
          if (l.product_id === id) {
            const newQty = l.quantity + delta;
            if (newQty <= 0) return null;
            return { ...l, quantity: Math.min(l.product.stock_quantity, newQty) };
          }
          return l;
        })
        .filter(Boolean) as CartLine[]
    );
  }

  // Cart & Discount Calculations
  const totalCartItems = cart.reduce((sum, line) => sum + line.quantity, 0);
  const isCouponEligible = totalCartItems >= 3;
  const subtotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const activeDiscountPercent = appliedCoupon && isCouponEligible ? Number(appliedCoupon.discount_percent) : 0;
  const discountAmount = Math.round((subtotal * activeDiscountPercent) / 100);
  const finalSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = finalSubtotal * 0.075; // 7.5% Nigerian VAT
  const grandTotal = finalSubtotal + tax;

  async function handleApplyCoupon(codeToApply?: string) {
    const code = (codeToApply || couponInput).trim();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    if (totalCartItems < 3) {
      setCouponError(`Coupons require at least 3 items in your cart (currently: ${totalCartItems}). Please add more items to use coupon.`);
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await apiRequest('/api/coupons/validate.php', 'POST', {
        coupon_code: code,
        item_count: totalCartItems,
      }, true);

      if (res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponInput(res.coupon.code);
        notify(`Coupon ${res.coupon.code} applied! ${res.discount_percent}% discount unlocked.`);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Invalid or expired coupon code.');
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    notify('Coupon removed from order.');
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (accountMode === 'register') {
        const registeredEmail = authForm.email;
        const res = await apiRequest('/api/users/register.php', 'POST', {
          first_name: authForm.first_name,
          last_name: authForm.last_name,
          email: authForm.email,
          password: authForm.password,
          referral_code: authForm.referral_code || undefined,
        });
        notify(res.message || 'Account created! A magic verification link has been sent to your email.');
        setAuthForm((prev) => ({ ...prev, email: registeredEmail, password: '' }));
        try {
          localStorage.removeItem('shopit_ref_code');
        } catch {
          // ignore
        }
        setAccountMode('verify_notice');

        // Optional frontend Nodemailer trigger
        if (res.debug_token) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'verification',
              to: registeredEmail,
              name: authForm.first_name,
              token: res.debug_token,
              frontendUrl: window.location.origin,
            }),
          }).catch(() => {});
        }
      } else {
        const guestItems = cart;
        const res = await apiRequest('/api/users/login.php', 'POST', {
          email: authForm.email,
          password: authForm.password,
        });
        saveAuth(res.token, {
          user_id: res.user_id,
          first_name: res.first_name,
          last_name: res.last_name,
          email: res.email,
        });
        setUser({
          user_id: res.user_id,
          first_name: res.first_name,
          last_name: res.last_name,
          email: res.email,
        });
        setAuthForm({ first_name: '', last_name: '', email: '', password: '', referral_code: '' });
        notify('Logged in successfully.');
        loadUserProfile();
        loadUserOrders();
        loadReferralData();
        loadUserCart(guestItems);

        // Optional frontend Nodemailer login alert trigger
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'login_alert',
            to: res.email,
            name: res.first_name,
            time: new Date().toLocaleString(),
          }),
        }).catch(() => {});
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    clearAuth();
    setUser(null);
    setUserOrders([]);
    setReferralData(null);
    setAppliedCoupon(null);
    setCart([]);
    try {
      localStorage.removeItem('shopit_cart');
    } catch {
      // ignore
    }
    setAuthForm({ first_name: '', last_name: '', email: '', password: '', referral_code: '' });
    notify('Logged out successfully.');
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setCheckoutError('');

    if (!isAuthenticated()) {
      setView('account');
      setAccountMode('login');
      setAuthForm({ first_name: '', last_name: '', email: '', password: '', referral_code: '' });
      notify('Please sign in or create an account to complete checkout.');
      return;
    }

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const currentCartItems = cart.map((line) => ({
        name: line.product.product_name,
        quantity: line.quantity,
        price: line.product.price,
      }));

      const payload = {
        shipping_address: checkoutForm.shipping_address,
        payment_method: checkoutForm.payment_method,
        coupon_code: appliedCoupon && isCouponEligible ? appliedCoupon.code : null,
        items: cart.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
        })),
      };

      const result = await apiRequest('/api/checkout/checkout.php', 'POST', payload, true);
      const finalOrderId = result.order_id;
      const finalOrderTotal = result.total_amount || grandTotal;

      setLastOrderResult({
        order_id: finalOrderId,
        total_amount: finalOrderTotal,
      });

      // Optional frontend Nodemailer order confirmation trigger
      if (user?.email) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'order_receipt',
            to: user.email,
            name: user.first_name || 'Customer',
            orderId: finalOrderId,
            items: currentCartItems,
            subtotal,
            discount: discountAmount,
            tax,
            total: finalOrderTotal,
            shippingAddress: checkoutForm.shipping_address,
            paymentMethod: checkoutForm.payment_method,
          }),
        }).catch(() => {});
      }

      setCart([]);
      try {
        localStorage.removeItem('shopit_cart');
      } catch {
        // ignore
      }
      setAppliedCoupon(null);
      setCouponInput('');
      loadUserOrders();
      loadReferralData();
      setView('confirmation');
      notify('Order placed successfully!');
    } catch (err: any) {
      setCheckoutError(err.message || 'Checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleNewsletterSubscribe(e: React.FormEvent, emailInput: string, resetFn?: () => void) {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      notify('Please enter a valid email address.');
      return;
    }

    setNewsletterLoading(true);
    try {
      const res = await apiRequest('/api/newsletter/subscribe.php', 'POST', { email: emailInput });
      notify(res.message || 'Subscribed to ShopIt updates!');
      setNewsletterMsg(res.message || 'Subscribed successfully!');
      if (resetFn) resetFn();
      setNewsletterEmail('');
    } catch (err: any) {
      notify(err.message || 'Failed to subscribe.');
    } finally {
      setNewsletterLoading(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch = (p.product_name + ' ' + (p.description || '') + ' ' + (p.category_name || '')).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === null || String(p.category_id) === String(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#f5f5f1] text-[#14212b] selection:bg-[#e0ee56] flex flex-col justify-between">
      <div>
        {/* Top Banner */}
        <div className="bg-[#14212b] px-3 sm:px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e0ee56]">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between text-center sm:text-left">
            <span className="flex items-center gap-2">
              Direct Retail & Wholesale Marketplace · Guaranteed Fast Delivery
            </span>
            <span className="hidden md:inline font-bold">Currency: Nigerian Naira (NGN / ₦)</span>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-[#14212b]/15 bg-[#f5f5f1]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="grid size-9 place-items-center border border-[#14212b]/20 md:hidden cursor-pointer hover:bg-[#14212b] hover:text-[#e0ee56] transition-colors"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>

              <button
                onClick={() => { setView('home'); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 text-xl font-black tracking-[-0.08em] cursor-pointer"
              >
                <span className="grid size-7 place-items-center bg-[#14212b] text-sm text-[#e0ee56] font-black">S</span>
                <span>SHOP IT</span>
              </button>

              <nav className="hidden items-center gap-6 text-xs font-bold uppercase tracking-[0.13em] md:flex ml-2">
                <button
                  onClick={() => { setView('home'); setSelectedCategory(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={view === 'home' ? 'text-[#9a4e2c]' : 'hover:text-[#9a4e2c] cursor-pointer'}
                >
                  Home
                </button>
                <button
                  onClick={() => { setView('shop'); setSelectedCategory(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={view === 'shop' && selectedCategory === null ? 'text-[#9a4e2c]' : 'hover:text-[#9a4e2c] cursor-pointer'}
                >
                  All Products
                </button>
                <button
                  onClick={() => { setView('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={view === 'about' ? 'text-[#9a4e2c]' : 'hover:text-[#9a4e2c] cursor-pointer'}
                >
                  About ShopIt
                </button>
              </nav>
            </div>

            {/* Desktop Search Bar */}
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

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => { setView('account'); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] hover:text-[#9a4e2c] cursor-pointer p-1"
              >
                <CircleUserRound className="size-4.5" />
                <span className="hidden sm:inline">{user ? user.first_name : 'Account'}</span>
              </button>

              <button
                onClick={() => setCartOpen(true)}
                className="relative grid size-9 place-items-center border border-[#14212b]/20 hover:bg-[#14212b] hover:text-[#e0ee56] transition-colors cursor-pointer"
                aria-label="View Shopping Bag"
              >
                <ShoppingCart className="size-4" />
                {cart.length > 0 && (
                  <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[#e0ee56] text-[#14212b] text-[10px] font-black shadow-xs">
                    {cart.reduce((acc, l) => acc + l.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search & Menu Expandable */}
          {mobileMenuOpen && (
            <div className="border-t border-[#14212b]/15 bg-[#f5f5f1] p-4 md:hidden animate-in slide-in-from-top-2 duration-150">
              {view === 'shop' && <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 size-4 text-[#14212b]/50" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (view !== 'shop') setView('shop');
                  }}
                  placeholder="Search products..."
                  className="w-full border border-[#14212b]/20 bg-[#e8e8e1]/50 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#9a4e2c]"
                />
              </div>}
              <div className="flex flex-col gap-2 text-xs font-black uppercase tracking-[0.14em]">
                <button
                  onClick={() => { setView('shop'); setSelectedCategory(null); setMobileMenuOpen(false); }}
                  className="p-2.5 text-left hover:bg-[#e8e8e1] border border-[#14212b]/10 cursor-pointer"
                >
                  All Products
                </button>
                <button
                  onClick={() => { setView('about'); setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="p-2.5 text-left hover:bg-[#e8e8e1] border border-[#14212b]/10 cursor-pointer text-[#9a4e2c]"
                >
                  About ShopIt
                </button>
                <button
                  onClick={() => { setView('home'); setMobileMenuOpen(false); }}
                  className="p-2.5 text-left hover:bg-[#e8e8e1] border border-[#14212b]/10 cursor-pointer"
                >
                  Home & Categories
                </button>
                <button
                  onClick={() => { setView('account'); setMobileMenuOpen(false); }}
                  className="p-2.5 text-left hover:bg-[#e8e8e1] border border-[#14212b]/10 cursor-pointer"
                >
                  My Account & Orders
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Main Views Container */}
        <main>
          {view === 'home' && (
            <HomeView
              products={products}
              categories={categories}
              productsLoading={productsLoading}
              productsError={productsError}
              categoriesLoading={categoriesLoading}
              onRetryProducts={loadProducts}
              onBrowseCategory={(catId) => {
                setSelectedCategory(catId);
                setView('shop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBrowseAll={() => {
                setSelectedCategory(null);
                setView('shop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onProduct={openProduct}
              onAddToCart={addToCart}
              newsletterEmail={newsletterEmail}
              setNewsletterEmail={setNewsletterEmail}
              onNewsletterSubmit={(e) => handleNewsletterSubscribe(e, newsletterEmail)}
              newsletterLoading={newsletterLoading}
              newsletterMsg={newsletterMsg}
              stats={stats}
            />
          )}

          {view === 'shop' && (
            <ShopView
              products={filteredProducts}
              categories={categories}
              productsLoading={productsLoading}
              productsError={productsError}
              onRetryProducts={loadProducts}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              search={search}
              onSearchChange={setSearch}
              onProduct={openProduct}
              onAddToCart={addToCart}
            />
          )}

          {view === 'product' && (
            selectedProduct ? (
              <ProductDetailView
                product={selectedProduct}
                onBack={() => setView('shop')}
                onAddToCart={addToCart}
              />
            ) : (
              <div className="mx-auto max-w-xl my-16 px-4 py-8 border border-[#14212b]/15 bg-[#f5f5f1] text-center">
                <Package className="size-10 mx-auto mb-2 text-[#14212b]/40" />
                <h3 className="font-black text-base uppercase">Product Not Selected</h3>
                <p className="mt-1 text-xs text-[#14212b]/60">Please choose a product from the catalog.</p>
                <button
                  onClick={() => setView('shop')}
                  className="mt-5 bg-[#14212b] text-[#e0ee56] px-5 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#1f3342]"
                >
                  Return to Catalog
                </button>
              </div>
            )
          )}

          {view === 'checkout' && (
            <CheckoutView
              cart={cart}
              subtotal={subtotal}
              tax={tax}
              form={checkoutForm}
              setForm={setCheckoutForm}
              onSubmit={handleCheckout}
              loading={checkoutLoading}
              error={checkoutError}
              onBack={() => setView('shop')}
              appliedCoupon={appliedCoupon}
              couponInput={couponInput}
              setCouponInput={setCouponInput}
              couponLoading={couponLoading}
              couponError={couponError}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={handleRemoveCoupon}
              availableCoupons={referralData?.active_coupons || []}
              totalCartItems={totalCartItems}
              isCouponEligible={isCouponEligible}
              discountAmount={discountAmount}
              grandTotal={grandTotal}
            />
          )}

          {view === 'confirmation' && lastOrderResult && (
            <OrderConfirmationView
              orderResult={lastOrderResult}
              onContinueShopping={() => { setView('shop'); setSelectedCategory(null); }}
              onViewAccount={() => setView('account')}
            />
          )}

          {view === 'account' && (
            <AccountView
              user={user}
              mode={accountMode}
              setMode={(m) => {
                setAccountMode(m);
                setAuthError('');
                setAuthForm({ first_name: '', last_name: '', email: '', password: '', referral_code: '' });
              }}
              form={authForm}
              setForm={setAuthForm}
              onSubmit={handleAuthSubmit}
              onLogout={handleLogout}
              loading={authLoading}
              error={authError}
              orders={userOrders}
              ordersLoading={ordersLoading}
              onRefreshOrders={loadUserOrders}
              referralData={referralData}
              referralLoading={referralLoading}
              onRefreshReferrals={loadReferralData}
              onNotify={notify}
            />
          )}

          {view === 'about' && (
            <AboutView
              stats={stats}
              onBrowseProducts={() => {
                setView('shop');
                setSelectedCategory(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBrowseCategories={() => {
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </main>
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#14212b]/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex h-full w-full max-w-full sm:max-w-md flex-col bg-[#f5f5f1] border-l border-[#14212b]/20 text-[#14212b] shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#14212b]/15 p-5 bg-[#e8e8e1]/60">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9a4e2c]">Selected Items</p>
                <h3 className="text-xl font-black uppercase tracking-[-0.04em]">Shopping Bag</h3>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="grid size-8 place-items-center border border-[#14212b]/20 hover:bg-[#14212b] hover:text-[#e0ee56] transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 divide-y divide-[#14212b]/10">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <Package className="size-12 text-[#14212b]/20 mb-3" />
                  <p className="font-black text-sm uppercase">Your bag is empty</p>
                  <p className="mt-1 text-xs text-[#14212b]/60 max-w-xs">
                    Browse our products and add items in Nigerian Naira (₦).
                  </p>
                  <button
                    onClick={() => { setCartOpen(false); setView('shop'); }}
                    className="mt-6 bg-[#14212b] text-[#e0ee56] px-5 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                cart.map((line) => (
                  <div key={line.product_id} className="flex gap-4 py-4">
                    <div className="size-16 shrink-0 bg-[#e8e8e1] border border-[#14212b]/15 overflow-hidden flex items-center justify-center">
                      {line.product.image_url ? (
                        <img
                          src={line.product.image_url}
                          alt={line.product.product_name}
                          className="size-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="size-6 text-[#14212b]/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black truncate">{line.product.product_name}</h4>
                      <p className="text-xs font-mono font-bold text-[#9a4e2c] mt-0.5">{money(line.product.price)} each</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center border border-[#14212b]/20 bg-[#f5f5f1]">
                          <button
                            onClick={() => updateQuantity(line.product_id, -1)}
                            className="grid size-6 place-items-center hover:bg-[#e8e8e1] cursor-pointer"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-black">{line.quantity}</span>
                          <button
                            onClick={() => updateQuantity(line.product_id, 1)}
                            disabled={line.quantity >= line.product.stock_quantity}
                            className="grid size-6 place-items-center hover:bg-[#e8e8e1] disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => updateQuantity(line.product_id, -line.quantity)}
                          className="text-[#9a4e2c] hover:text-[#783c21] p-1 cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-[#14212b]/15 bg-[#e8e8e1] p-5 space-y-3">
                <div className="flex justify-between text-xs font-bold text-[#14212b]/70">
                  <span>Subtotal</span>
                  <span className="font-mono font-black">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-[#14212b]/70">
                  <span>VAT (7.5%)</span>
                  <span className="font-mono font-black">{money(tax)}</span>
                </div>
                <div className="flex justify-between text-base font-black border-t border-[#14212b]/15 pt-2">
                  <span>Total Due (NGN)</span>
                  <span className="font-mono text-lg text-[#9a4e2c]">{money(subtotal + tax)}</span>
                </div>

                <button
                  onClick={() => {
                    setCartOpen(false);
                    setView('checkout');
                  }}
                  className="w-full mt-2 bg-[#14212b] text-[#e0ee56] py-3.5 text-xs font-black uppercase tracking-[.15em] flex items-center justify-center gap-2 hover:bg-[#14212b]/90 cursor-pointer shadow-lg"
                >
                  Proceed to Checkout <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Redesigned Multi-Column Footer */}
      <footer className="mt-20 border-t border-[#14212b]/15 bg-[#14212b] text-[#f5f5f1]">
        {/* Main Footer Body */}
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-14 lg:py-18">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
            {/* Col 1: Brand (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2.5 text-xl font-black tracking-tight">
                <span className="grid size-7 place-items-center bg-[#e0ee56] text-sm text-[#14212b] font-black">S</span>
                <span>SHOP IT COMMERCE</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed max-w-sm">
                Nigeria's premier direct goods marketplace. Supplying quality electronics, solar energy systems, industrial equipment, and workplace solutions nationwide.
              </p>
              <div className="pt-2 text-xs text-white/40 space-y-1 font-mono">
                <p>RC Number: 1894022-NG</p>
                <p>Location: Victoria Island, Lagos, Nigeria</p>
                <p>Customer Support: support@shopit.co</p>
              </div>
            </div>

            {/* Col 2: Categories (3 cols) */}
            <div className="lg:col-span-3 space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#e0ee56]">Categories</p>
              <ul className="space-y-2 text-xs text-white/70">
                {categories.slice(0, 5).map((cat) => (
                  <li key={cat.category_id}>
                    <button
                      onClick={() => { setSelectedCategory(cat.category_id); setView('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="hover:text-[#e0ee56] transition-colors cursor-pointer text-left"
                    >
                      {cat.category_name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Customer Links (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#e0ee56]">Customer Service</p>
              <ul className="space-y-2 text-xs text-white/70">
                <li><button onClick={() => setView('account')} className="hover:text-[#e0ee56] cursor-pointer">My Account</button></li>
                <li><button onClick={() => { setView('shop'); setSelectedCategory(null); }} className="hover:text-[#e0ee56] cursor-pointer">Catalog Inventory</button></li>
                <li><button onClick={() => { setView('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#e0ee56] cursor-pointer">About ShopIt</button></li>
                <li><span className="text-white/40">Delivery & Returns</span></li>
                <li><span className="text-white/40">Privacy Policy</span></li>
              </ul>
            </div>

            {/* Col 4: Newsletter Box (3 cols) */}
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

              <FooterNewsletterForm onSubscribe={handleNewsletterSubscribe} loading={newsletterLoading} />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 bg-[#0d161d] px-4 sm:px-6 py-5 text-xs text-white/50">
          <div className="mx-auto flex max-w-[1440px] flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-center sm:text-left">
              <span>© 2026 ShopIt Commerce Ltd. All rights reserved.</span>
              <span className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1.5 bg-[#14212b] border border-white/10 px-2 py-0.5 text-[10px] font-bold text-[#e0ee56]">
                🇳🇬 Currency: NGN (₦)
              </span>
            </div>

            <div className="flex items-center gap-2 text-white/60 text-[11px]">
              <ShieldCheck className="size-4 text-[#e0ee56]" />
              <span>Verified Secure 256-Bit Encrypted Checkout</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating scroll control */}
      <button
        onClick={() => {
          window.scrollTo({ top: showScrollDown ? document.documentElement.scrollHeight : 0, behavior: 'smooth' });
        }}
        aria-label={showScrollDown ? 'Scroll to bottom' : 'Back to top'}
        title={showScrollDown ? 'Scroll to bottom' : 'Back to top'}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-[#14212b] text-[#e0ee56] hover:bg-[#1a2d3c] border-2 border-[#e0ee56] px-4 py-3 sm:px-5 sm:py-3.5 rounded-none shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group"
      >
        {showScrollDown
          ? <ArrowDown className="size-5 text-[#e0ee56] group-hover:translate-y-0.5 transition-transform" />
          : <ArrowUp className="size-5 text-[#e0ee56] group-hover:-translate-y-0.5 transition-transform" />}
      </button>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 right-6 z-50 border border-[#14212b] bg-[#e0ee56] text-[#14212b] px-4 sm:px-5 py-3 text-xs font-black uppercase tracking-[0.14em] shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-w-[calc(100vw-2rem)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function FooterNewsletterForm({
  onSubscribe,
  loading,
}: {
  onSubscribe: (e: React.FormEvent, email: string, resetFn: () => void) => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');

  return (
    <form onSubmit={(e) => onSubscribe(e, email, () => setEmail(''))} className="flex flex-col gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="yourname@gmail.com"
        className="border border-white/20 bg-[#14212b] px-3 py-2 text-xs text-white outline-none focus:border-[#e0ee56] placeholder:text-white/40"
      />
      <button
        disabled={loading}
        className="bg-[#e0ee56] text-[#14212b] px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-[#d4e24a] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            <span>Joining...</span>
          </>
        ) : (
          'Subscribe'
        )}
      </button>
    </form>
  );
}

function HomeView({
  products,
  categories,
  productsLoading,
  productsError,
  categoriesLoading,
  onRetryProducts,
  onBrowseCategory,
  onBrowseAll,
  onProduct,
  onAddToCart,
  newsletterEmail,
  setNewsletterEmail,
  onNewsletterSubmit,
  newsletterLoading,
  newsletterMsg,
  stats,
}: {
  products: Product[];
  categories: Category[];
  productsLoading: boolean;
  productsError: string;
  categoriesLoading: boolean;
  onRetryProducts: () => void;
  onBrowseCategory: (catId: number) => void;
  onBrowseAll: () => void;
  onProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  newsletterEmail: string;
  setNewsletterEmail: (e: string) => void;
  onNewsletterSubmit: (e: React.FormEvent) => void;
  newsletterLoading: boolean;
  newsletterMsg: string;
  stats: PlatformStats | null;
}) {
  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-[#14212b] px-4 sm:px-6 py-16 sm:py-24 text-[#f5f5f1] md:py-32">
        <div className="mx-auto grid max-w-[1440px] gap-10 lg:gap-14 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <div className="mb-4 sm:mb-6 inline-flex flex-wrap items-center gap-2 border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#e0ee56]">
              <span>Direct Pricing · Fast Nationwide Delivery</span>
            </div>

            <h1 className="max-w-4xl text-[clamp(2.6rem,7vw,7.5rem)] font-black uppercase leading-[.88] sm:leading-[.84] tracking-[-0.08em] sm:tracking-[-0.09em]">
              Quality goods.<br />
              <span className="text-[#e0ee56]">Direct Naira pricing.</span>
            </h1>

            <p className="mt-6 max-w-xl text-sm sm:text-base leading-relaxed text-white/70">
              Discover quality food stuff, everyday groceries, stationery, consumer electronics, solar systems, home essentials, and workshop tools with transparent Naira pricing.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={onBrowseAll}
                className="group flex items-center gap-4 bg-[#e0ee56] px-7 py-4 text-xs font-black uppercase tracking-[.16em] text-[#14212b] cursor-pointer hover:bg-[#d4e24a] shadow-xl"
              >
                Browse All Products <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Live Verified System Metrics (Direct from API) */}
            <div className="mt-12 pt-8 border-t border-white/15 grid grid-cols-3 gap-4 text-left">
              <div>
                <p className="text-xl sm:text-2xl font-black text-[#e0ee56]">
                  {stats ? stats.orders_delivered : 0}
                </p>
                <p className="text-[11px] text-white/50 uppercase font-bold tracking-wider mt-0.5">Orders Delivered</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">
                  {stats ? stats.total_products : products.length}
                </p>
                <p className="text-[11px] text-white/50 uppercase font-bold tracking-wider mt-0.5">Verified Products</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">
                  {stats ? stats.total_categories : categories.length}
                </p>
                <p className="text-[11px] text-white/50 uppercase font-bold tracking-wider mt-0.5">Categories</p>
              </div>
            </div>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-white/20 pt-8 sm:pt-0 sm:pl-8 lg:mb-4">
            <div className="bg-[#1b2b38] border border-white/15 p-6 rounded-xs space-y-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e0ee56]">Available Categories</p>
              <div className="text-4xl sm:text-6xl font-black tracking-tight text-white">
                {categoriesLoading ? <Skeleton className="h-14 w-32 bg-white/20" /> : categories.length + ' Categories'}
              </div>
              <p className="text-xs leading-relaxed text-white/70">
                All catalog items reflect live inventory in our warehouses ready for immediate dispatch across Nigeria.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-[#e0ee56] font-bold">
                <span>Fast Order Processing</span>
                <span>Verified Stock</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Filter Dropdown Bar */}
      <section className="border-b border-[#14212b]/15 bg-[#e8e8e1] px-4 sm:px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-[1440px] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#9a4e2c]">
              <SlidersHorizontal className="size-3.5" />
              <span>Product Categories</span>
            </div>
            <h2 className="mt-1 text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#14212b]">
              Filter by Category
            </h2>
            <p className="mt-1 text-xs text-[#14212b]/70 leading-relaxed">
              Select any of our {categories.length} verified sectors to view products with live stock and direct Naira (₦) pricing.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onBrowseCategory(parseInt(e.target.value, 10));
                  } else {
                    onBrowseAll();
                  }
                }}
                className="w-full appearance-none border-2 border-[#14212b] bg-[#f5f5f1] py-3.5 pl-4 pr-10 text-xs font-black uppercase tracking-wider outline-none focus:border-[#9a4e2c] cursor-pointer shadow-md"
              >
                <option value="">Choose a Product Category ({categories.length} Sectors)</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={String(cat.category_id)}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-4 size-4 text-[#14212b]" />
            </div>

            <button
              onClick={onBrowseAll}
              className="bg-[#14212b] text-[#e0ee56] hover:bg-[#1f3342] px-6 py-3.5 text-xs font-black uppercase tracking-[0.14em] transition-colors cursor-pointer whitespace-nowrap shadow-md text-center"
            >
              All Products
            </button>
          </div>
        </div>
      </section>

      {/* 3. Featured Products with Naira Pricing */}
      <section className="bg-[#e8e8e1] px-4 sm:px-6 py-14 sm:py-20 border-y border-[#14212b]/15">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a4e2c]">Popular Items</p>
              <h2 className="mt-2 text-3xl sm:text-5xl font-black uppercase tracking-tight">Featured In-Demand Products</h2>
            </div>
            <button
              onClick={onBrowseAll}
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#14212b] hover:text-[#9a4e2c] cursor-pointer"
            >
              View Full Catalog <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {productsLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </>
            ) : productsError ? (
              <div className="col-span-full border border-[#9a4e2c]/30 bg-[#fee2e2]/50 p-8 text-center text-[#991b1b]">
                <AlertCircle className="size-8 mx-auto mb-2 text-[#9a4e2c]" />
                <h4 className="font-black uppercase tracking-wider text-sm">Product Catalog Temporarily Unavailable</h4>
                <p className="text-xs text-[#14212b]/70 mt-1 max-w-md mx-auto">{productsError}</p>
                <button
                  onClick={onRetryProducts}
                  className="mt-4 inline-flex items-center gap-2 bg-[#14212b] text-[#e0ee56] px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-[#1f3342] cursor-pointer"
                >
                  <RefreshCw className="size-3.5" /> Retry Loading Products
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm text-[#14212b]/60">
                <Package className="size-10 mx-auto mb-2 text-[#14212b]/30" />
                No products available at the moment.
              </div>
            ) : (
              products.slice(0, 8).map((p) => (
                <ProductCard key={p.product_id} product={p} onProduct={onProduct} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 4. Advantages / Why ShopIt */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a4e2c]">The ShopIt Advantage</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-black uppercase tracking-tight">Why Shop with Us</h2>
          <p className="mt-3 text-sm text-[#14212b]/70">
            Delivering quality goods with verified pricing, secure settlement, and reliable nationwide fulfillment.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-6 flex flex-col justify-between">
            <div className="size-12 bg-[#14212b] text-[#e0ee56] grid place-items-center mb-6">
              <Zap className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Direct Pricing</h3>
              <p className="mt-2 text-xs text-[#14212b]/70 leading-relaxed">
                Enjoy transparent Nigerian Naira pricing directly mapped to actual inventory without hidden markups.
              </p>
            </div>
          </div>

          <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-6 flex flex-col justify-between">
            <div className="size-12 bg-[#14212b] text-[#e0ee56] grid place-items-center mb-6">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Secure Payment</h3>
              <p className="mt-2 text-xs text-[#14212b]/70 leading-relaxed">
                Pay securely using Bank Transfer, Debit Card, or Corporate Invoice with instant payment receipts.
              </p>
            </div>
          </div>

          <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-6 flex flex-col justify-between">
            <div className="size-12 bg-[#14212b] text-[#e0ee56] grid place-items-center mb-6">
              <Truck className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Fast Dispatch</h3>
              <p className="mt-2 text-xs text-[#14212b]/70 leading-relaxed">
                Prompt order processing with rapid door-to-door delivery across Lagos, Abuja, and all Nigerian states.
              </p>
            </div>
          </div>

          <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-6 flex flex-col justify-between">
            <div className="size-12 bg-[#14212b] text-[#e0ee56] grid place-items-center mb-6">
              <Building2 className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Bulk Orders &amp; Invoicing</h3>
              <p className="mt-2 text-xs text-[#14212b]/70 leading-relaxed">
                Ideal for both individual buyers and commercial accounts requiring bulk purchases and itemized invoices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Customer Testimonials (No Star Icons) */}
      <section className="bg-[#14212b] px-4 sm:px-6 py-16 sm:py-24 text-[#f5f5f1]">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/15 pb-6 mb-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e0ee56]">Customer Feedback</p>
              <h2 className="mt-2 text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">What Our Customers Say</h2>
            </div>
            <p className="text-xs text-white/50 font-bold">Feedback from buyers across Nigeria</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="border border-white/15 bg-white/5 p-6 space-y-4">
              <Quote className="size-6 text-[#e0ee56] opacity-60" />
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                "ShopIt's solar hardware pricing enabled our firm to execute our 200kW installation smoothly with significant cost savings."
              </p>
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs font-black text-white">Engr. Tunde Adeleke</p>
                <p className="text-[10px] text-white/50 uppercase font-mono">Lagos, Nigeria</p>
              </div>
            </div>

            <div className="border border-white/15 bg-white/5 p-6 space-y-4">
              <Quote className="size-6 text-[#e0ee56] opacity-60" />
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                "Real stock visibility is wonderful. Fast delivery and the products were exactly as described on the website."
              </p>
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs font-black text-white">Chidinma Okoye</p>
                <p className="text-[10px] text-white/50 uppercase font-mono">Port Harcourt, Nigeria</p>
              </div>
            </div>

            <div className="border border-white/15 bg-white/5 p-6 space-y-4">
              <Quote className="size-6 text-[#e0ee56] opacity-60" />
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                "The automated order confirmation and instant invoice generation made our company purchasing process hassle-free."
              </p>
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs font-black text-white">Alhaji Bello Mohammed</p>
                <p className="text-[10px] text-white/50 uppercase font-mono">Kano, Nigeria</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Newsletter Banner Section */}
      <section className="bg-[#e0ee56] px-4 sm:px-6 py-14 sm:py-20 text-[#14212b]">
        <div className="mx-auto max-w-[1440px] grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a4e2c]">Stay Updated</p>
            <h2 className="mt-2 text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Subscribe to Our Newsletter
            </h2>
            <p className="mt-3 text-sm text-[#14212b]/80 leading-relaxed max-w-lg">
              Join our community to receive updates on new product arrivals, seasonal promotions, and special discount offers.
            </p>
          </div>

          <div className="bg-[#14212b] p-6 sm:p-8 text-[#f5f5f1] shadow-2xl">
            <h3 className="text-lg font-black uppercase text-white mb-2">Subscribe to Offers</h3>
            <p className="text-xs text-white/60 mb-4">No spam. Unsubscribe anytime.</p>

            <form onSubmit={onNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="flex-1 border border-white/20 bg-[#1b2b38] px-4 py-3.5 text-xs text-white outline-none focus:border-[#e0ee56] placeholder:text-white/40"
              />
              <button
                disabled={newsletterLoading}
                className="bg-[#e0ee56] text-[#14212b] px-6 py-3.5 text-xs font-black uppercase tracking-wider hover:bg-[#d4e24a] cursor-pointer disabled:opacity-50 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
              >
                {newsletterLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Subscribing...</span>
                  </>
                ) : (
                  'Subscribe'
                )}
              </button>
            </form>
            {newsletterMsg && (
              <p className="mt-3 text-xs text-[#e0ee56] font-bold">{newsletterMsg}</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#f5f5f1] border border-[#14212b]/15 p-4">
      <Skeleton className="aspect-4/3 w-full mb-4" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="mt-4 pt-3 border-t border-[#14212b]/10 flex justify-between items-center">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function ProductCard({ product, onProduct }: { product: Product; onProduct: (p: Product) => void }) {
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <div
      onClick={() => onProduct(product)}
      className="group flex flex-col justify-between border border-[#14212b]/15 bg-[#f5f5f1] p-4 sm:p-5 transition-all hover:border-[#14212b] hover:shadow-xl cursor-pointer"
    >
      <div>
        <div className="relative aspect-4/3 w-full overflow-hidden bg-[#e8e8e1] border border-[#14212b]/10 flex items-center justify-center mb-4">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.product_name}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Package className="size-10 text-[#14212b]/25" />
          )}

          {isOutOfStock ? (
            <span className="absolute top-2 right-2 bg-[#fee2e2] text-[#991b1b] text-[10px] font-black uppercase px-2 py-0.5 shadow-xs">
              Sold Out
            </span>
          ) : product.stock_quantity < 10 ? (
            <span className="absolute top-2 right-2 bg-[#f2cf96] text-[#6b4712] text-[10px] font-black uppercase px-2 py-0.5 shadow-xs">
              {product.stock_quantity} Left
            </span>
          ) : null}
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#9a4e2c]">
          {product.category_name || 'General Product'}
        </p>
        <h3 className="mt-1 font-black text-base tracking-tight group-hover:text-[#9a4e2c] transition-colors line-clamp-1">
          {product.product_name}
        </h3>
        <p className="mt-1 text-xs text-[#14212b]/60 line-clamp-2 leading-relaxed">
          {product.description || 'Quality product specification.'}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-[#14212b]/10 pt-4">
        <span className="text-base font-black font-mono text-[#14212b]">{money(product.price)}</span>
        <span className="text-[10px] font-black uppercase tracking-wider text-[#14212b]/60 group-hover:text-[#14212b] group-hover:underline flex items-center gap-1">
          Inspect <ArrowRight className="size-3" />
        </span>
      </div>
    </div>
  );
}

function ShopView({
  products,
  categories,
  productsLoading,
  productsError,
  onRetryProducts,
  selectedCategory,
  onSelectCategory,
  search,
  onSearchChange,
  onProduct,
  onAddToCart,
}: {
  products: Product[];
  categories: Category[];
  productsLoading: boolean;
  productsError: string;
  onRetryProducts: () => void;
  selectedCategory: number | null;
  onSelectCategory: (catId: number | null) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-3 sm:px-5 py-8 md:py-14">
      {/* Shop Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#14212b]/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a4e2c]">Live Products</p>
          <h1 className="mt-1 text-3xl sm:text-5xl font-black uppercase tracking-tight">Product Catalog (₦)</h1>
        </div>
        <p className="text-xs text-[#14212b]/60 font-bold">
          Showing {products.length} products
        </p>
      </div>

      {/* Category Dropdown Filter Bar */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#e8e8e1] border border-[#14212b]/15 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#14212b]/80">
            <SlidersHorizontal className="size-4 text-[#9a4e2c]" />
            <span>Category:</span>
          </div>

          <div className="relative min-w-[240px] sm:w-80">
            <select
              value={selectedCategory === null ? '' : String(selectedCategory)}
              onChange={(e) => onSelectCategory(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full appearance-none border border-[#14212b]/25 bg-[#f5f5f1] py-2.5 pl-3.5 pr-10 text-xs font-black uppercase tracking-wider outline-none focus:border-[#9a4e2c] cursor-pointer shadow-xs"
            >
              <option value="">All Categories ({categories.length} Sectors)</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={String(cat.category_id)}>
                  {cat.category_name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-[#14212b]/60" />
          </div>

          {selectedCategory !== null && (
            <button
              onClick={() => onSelectCategory(null)}
              className="inline-flex items-center gap-1.5 bg-[#14212b] text-[#e0ee56] px-3.5 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-[#14212b]/85 cursor-pointer shadow-xs transition-colors"
            >
              <X className="size-3.5" /> All Categories
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-[#14212b]/70 flex items-center gap-2">
          <span>Active Filter:</span>
          <span className="font-black text-[#14212b]">
            {selectedCategory === null
              ? 'All Products'
              : categories.find((c) => String(c.category_id) === String(selectedCategory))?.category_name || 'Selected Category'}
          </span>
          <span className="bg-[#14212b] text-[#e0ee56] px-2 py-0.5 text-[10px] font-black">
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {productsLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </>
        ) : productsError ? (
          <div className="col-span-full border border-[#9a4e2c]/30 bg-[#fee2e2]/50 p-12 text-center text-[#991b1b]">
            <AlertCircle className="size-10 mx-auto mb-3 text-[#9a4e2c]" />
            <h3 className="font-black uppercase tracking-wider text-base">Unable to Load Products</h3>
            <p className="text-xs text-[#14212b]/70 mt-1 max-w-md mx-auto">{productsError}</p>
            <button
              onClick={onRetryProducts}
              className="mt-5 inline-flex items-center gap-2 bg-[#14212b] text-[#e0ee56] px-5 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-[#1f3342] cursor-pointer"
            >
              <RefreshCw className="size-4" /> Retry Catalog
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="col-span-full py-20 text-center text-sm text-[#14212b]/60">
            <Package className="size-10 mx-auto mb-2 text-[#14212b]/30" />
            No products found matching the criteria.
          </div>
        ) : (
          products.map((p) => (
            <ProductCard key={p.product_id} product={p} onProduct={onProduct} />
          ))
        )}
      </div>
    </section>
  );
}

function ProductDetailView({
  product,
  onBack,
  onAddToCart,
}: {
  product: Product;
  onBack: () => void;
  onAddToCart: (p: Product, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <section className="mx-auto max-w-[1440px] px-3 sm:px-5 py-8 md:py-14">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#14212b]/70 hover:text-[#14212b] cursor-pointer"
      >
        <ChevronLeft className="size-4" /> Back to Catalog
      </button>

      <div className="grid gap-8 lg:gap-12 lg:grid-cols-2">
        {/* Image Box */}
        <div className="relative aspect-4/3 sm:aspect-square w-full bg-[#e8e8e1] border border-[#14212b]/15 overflow-hidden flex items-center justify-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.product_name}
              className="size-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Package className="size-20 text-[#14212b]/30" />
          )}

          {isOutOfStock ? (
            <div className="absolute inset-0 bg-[#14212b]/70 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-[#fee2e2] text-[#991b1b] text-sm font-black uppercase px-4 py-2">
                Currently Out of Stock
              </span>
            </div>
          ) : null}
        </div>

        {/* Product Details */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-[.18em] text-[#9a4e2c]">
                Category: {product.category_name || 'General Product'}
              </span>
              <span className="text-xs text-[#14212b]/40">· SKU #{product.product_id}</span>
            </div>

            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight">
              {product.product_name}
            </h1>

            <div className="mt-4 text-2xl sm:text-3xl font-mono font-black text-[#14212b]">
              {money(product.price)}
            </div>

            <p className="mt-6 text-sm sm:text-base leading-relaxed text-[#14212b]/75">
              {product.description || 'Quality product specification.'}
            </p>

            <div className="mt-8 border-t border-[#14212b]/15 pt-6 space-y-2 text-xs font-bold">
              <div className="flex justify-between">
                <span className="text-[#14212b]/60">Stock Availability</span>
                <span className={isOutOfStock ? 'text-red-600' : 'text-emerald-700'}>
                  {isOutOfStock ? '0 units (Sold Out)' : product.stock_quantity + ' units in stock'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#14212b]/60">Delivery</span>
                <span>Fast Nationwide Dispatch</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#14212b]/60">Currency</span>
                <span className="font-mono">Nigerian Naira (NGN / ₦)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#14212b]/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex items-center justify-center border border-[#14212b]/25 bg-[#f5f5f1]">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                disabled={isOutOfStock || qty <= 1}
                className="grid size-11 place-items-center hover:bg-[#e8e8e1] disabled:opacity-30 cursor-pointer"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-12 text-center text-sm font-black">{qty}</span>
              <button
                onClick={() => setQty(Math.min(product.stock_quantity, qty + 1))}
                disabled={isOutOfStock || qty >= product.stock_quantity}
                className="grid size-11 place-items-center hover:bg-[#e8e8e1] disabled:opacity-30 cursor-pointer"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <button
              onClick={() => onAddToCart(product, qty)}
              disabled={isOutOfStock}
              className="flex-1 bg-[#14212b] text-[#e0ee56] py-3.5 px-6 text-xs font-black uppercase tracking-[.15em] flex items-center justify-center gap-2 hover:bg-[#14212b]/90 disabled:opacity-40 cursor-pointer shadow-lg transition-all"
            >
              <ShoppingCart className="size-4" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Shopping Bag'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckoutView({
  cart,
  subtotal,
  tax,
  form,
  setForm,
  onSubmit,
  loading,
  error,
  onBack,
  appliedCoupon,
  couponInput,
  setCouponInput,
  couponLoading,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  availableCoupons,
  totalCartItems,
  isCouponEligible,
  discountAmount,
  grandTotal,
}: {
  cart: CartLine[];
  subtotal: number;
  tax: number;
  form: { shipping_address: string; payment_method: string };
  setForm: React.Dispatch<React.SetStateAction<{ shipping_address: string; payment_method: string }>>;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  onBack: () => void;
  appliedCoupon: Coupon | null;
  couponInput: string;
  setCouponInput: (v: string) => void;
  couponLoading: boolean;
  couponError: string;
  onApplyCoupon: (code?: string) => void;
  onRemoveCoupon: () => void;
  availableCoupons: Coupon[];
  totalCartItems: number;
  isCouponEligible: boolean;
  discountAmount: number;
  grandTotal: number;
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-3 sm:px-5 py-8 md:py-14">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#14212b]/70 hover:text-[#14212b] cursor-pointer"
      >
        <ChevronLeft className="size-4" /> Back to Catalog
      </button>

      <div className="border-b border-[#14212b]/15 pb-6 mb-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a4e2c]">Order Fulfillment</p>
        <h1 className="mt-1 text-3xl sm:text-5xl font-black uppercase tracking-tight">Checkout in Naira (₦)</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          {error && (
            <div className="mb-6 flex items-start gap-2 bg-[#fee2e2] border border-[#991b1b]/20 p-4 text-xs text-[#991b1b]">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-5 sm:p-6">
              <h3 className="font-black uppercase tracking-tight text-base mb-4">1. Delivery Address</h3>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">
                  Shipping Address (Home / Office / Facility)
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.shipping_address}
                  onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                  placeholder="Street Address, City, State (e.g. 14 Marina Road, Lagos Island, Lagos)"
                  className="w-full border border-[#14212b]/20 bg-[#f5f5f1] p-3 text-xs outline-none focus:border-[#9a4e2c]"
                />
              </div>
            </div>

            <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-5 sm:p-6">
              <h3 className="font-black uppercase tracking-tight text-base mb-4">2. Payment Method (NGN)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['Bank Transfer', 'Debit Card', 'Corporate Invoice'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm({ ...form, payment_method: method })}
                    className={
                      'p-3 text-left text-xs font-bold border transition-colors cursor-pointer ' +
                      (form.payment_method === method
                        ? 'bg-[#14212b] text-[#e0ee56] border-[#14212b]'
                        : 'bg-[#f5f5f1] border-[#14212b]/20 hover:bg-[#e8e8e1]')
                    }
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Coupon & Referral Rewards Redemption */}
            <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black uppercase tracking-tight text-base flex items-center gap-2">
                  <Tag className="size-4 text-[#9a4e2c]" /> 3. Referral Coupons & Discounts
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#14212b] text-[#e0ee56] px-2 py-0.5">
                  1 Coupon per checkout
                </span>
              </div>

              {/* Min 3 Items Notice */}
              <div
                className={
                  'p-3 mb-4 text-xs flex items-start gap-2.5 border ' +
                  (isCouponEligible
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900')
                }
              >
                {isCouponEligible ? (
                  <CheckCheck className="size-4 shrink-0 mt-0.5 text-emerald-700" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-700" />
                )}
                <div>
                  <p className="font-bold">
                    {isCouponEligible
                      ? `Cart Qualified (${totalCartItems} items in cart)`
                      : `Cart Requires Minimum 3 Items (Currently: ${totalCartItems})`}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {isCouponEligible
                      ? 'You meet the 3-product threshold. Referral discount will be applied to your order subtotal.'
                      : `Referral coupons strictly require a minimum of 3 items in your shopping bag. Add ${3 - totalCartItems} more item(s) to activate coupon.`}
                  </p>
                </div>
              </div>

              {appliedCoupon ? (
                <div className="border border-emerald-500 bg-emerald-100/70 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center bg-emerald-700 text-white font-mono font-black text-xs rounded">
                      %{appliedCoupon.discount_percent}
                    </span>
                    <div>
                      <p className="font-mono font-black text-xs text-emerald-950">
                        {appliedCoupon.code}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        {appliedCoupon.discount_percent}% Discount Unlocked
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveCoupon}
                    className="text-xs font-black uppercase text-red-700 hover:text-red-900 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="ENTER COUPON CODE"
                      className="flex-1 border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2.5 text-xs font-mono font-black tracking-wider outline-none focus:border-[#9a4e2c]"
                    />
                    <button
                      type="button"
                      onClick={() => onApplyCoupon()}
                      disabled={couponLoading || !couponInput.trim()}
                      className="bg-[#14212b] text-[#e0ee56] px-5 py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer hover:bg-[#1f3342] transition-colors"
                    >
                      {couponLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  </div>

                  {couponError && (
                    <p className="text-xs font-bold text-red-700">{couponError}</p>
                  )}

                  {availableCoupons.length > 0 && (
                    <div className="pt-2 border-t border-[#14212b]/10">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#14212b]/60 mb-2">
                        Your Active Wallet Coupons (Click to Apply):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableCoupons.map((c) => {
                          const expiry = formatCouponExpiry(c.expires_at, c.is_used, c.is_expired);
                          return (
                            <button
                              key={c.coupon_id}
                              type="button"
                              onClick={() => onApplyCoupon(c.code)}
                              className="inline-flex items-center gap-1.5 border border-[#14212b]/20 bg-[#f5f5f1] px-2.5 py-1 text-xs font-mono font-bold hover:bg-[#14212b] hover:text-[#e0ee56] transition-colors cursor-pointer"
                            >
                              <Ticket className="size-3 text-[#9a4e2c]" />
                              <span>{c.code}</span>
                              <span className="font-sans text-[10px] font-black bg-[#e8e8e1] text-[#14212b] px-1 py-0.2">
                                {c.discount_percent}% OFF
                              </span>
                              <span className="font-sans text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded flex items-center gap-0.5">
                                <Clock className="size-2.5" /> {expiry.text}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              disabled={loading || cart.length === 0}
              className="bg-[#14212b] text-[#e0ee56] py-4 text-xs font-black uppercase tracking-[.16em] disabled:opacity-40 cursor-pointer hover:bg-[#14212b]/90 shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                'Place Order (₦)'
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-5 sm:p-6 h-fit">
          <h3 className="font-black uppercase tracking-tight text-base pb-4 border-b border-[#14212b]/15">
            Order Summary ({totalCartItems} Items)
          </h3>

          <div className="divide-y divide-[#14212b]/10 my-4 max-h-60 overflow-y-auto pr-2">
            {cart.map((line) => (
              <div key={line.product_id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold">{line.product.product_name}</p>
                  <p className="text-[10px] text-[#14212b]/60">Qty: {line.quantity} × {money(line.product.price)}</p>
                </div>
                <span className="font-mono font-black">{money(Number(line.product.price) * line.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#14212b]/15 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-[#14212b]/70">
              <span>Subtotal</span>
              <span className="font-mono font-black">{money(subtotal)}</span>
            </div>

            {appliedCoupon && isCouponEligible && discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-1.5 -mx-1.5">
                <span className="flex items-center gap-1">
                  <Tag className="size-3" /> Referral Discount ({appliedCoupon.discount_percent}%)
                </span>
                <span className="font-mono font-black">-{money(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-[#14212b]/70">
              <span>VAT (7.5%)</span>
              <span className="font-mono font-black">{money(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-black border-t border-[#14212b]/15 pt-3">
              <span>Total Due (NGN)</span>
              <span className="font-mono text-lg text-[#9a4e2c]">{money(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrderConfirmationView({
  orderResult,
  onContinueShopping,
  onViewAccount,
}: {
  orderResult: { order_id: string | number; total_amount: number | string };
  onContinueShopping: () => void;
  onViewAccount: () => void;
}) {
  return (
    <section className="mx-auto max-w-2xl px-4 sm:px-5 py-14 sm:py-20 text-center">
      <div className="size-16 bg-[#e0ee56] text-[#14212b] grid place-items-center mx-auto rounded-full mb-6 shadow-md">
        <Check className="size-8" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#9a4e2c]">Order Authenticated</p>
      <h1 className="mt-2 text-3xl sm:text-5xl font-black uppercase tracking-tight">Order Confirmed!</h1>
      <p className="mt-4 text-xs sm:text-sm text-[#14212b]/70">
        Your order has been recorded and submitted for dispatch.
      </p>

      <div className="my-8 border border-[#14212b]/15 bg-[#e8e8e1] p-5 sm:p-6 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-[10px] font-black uppercase text-[#14212b]/50">Order Reference</span>
          <p className="font-mono font-black text-sm mt-1">#{orderResult.order_id}</p>
        </div>
        <div>
          <span className="text-[10px] font-black uppercase text-[#14212b]/50">Total Settled</span>
          <p className="font-black text-sm mt-1">{money(orderResult.total_amount)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={onViewAccount}
          className="w-full sm:w-auto bg-[#14212b] text-[#e0ee56] px-6 py-3.5 text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#14212b]/90"
        >
          View in My Account
        </button>
        <button
          onClick={onContinueShopping}
          className="w-full sm:w-auto border border-[#14212b]/25 px-6 py-3.5 text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#e8e8e1]"
        >
          Continue Shopping
        </button>
      </div>
    </section>
  );
}

function AccountView({
  user,
  mode,
  setMode,
  form,
  setForm,
  onSubmit,
  onLogout,
  loading,
  error,
  orders,
  ordersLoading,
  onRefreshOrders,
  referralData,
  referralLoading,
  onRefreshReferrals,
  onNotify,
}: {
  user: Partial<User> | null;
  mode: 'login' | 'register' | 'verify_notice';
  setMode: (m: 'login' | 'register' | 'verify_notice') => void;
  form: { first_name: string; last_name: string; email: string; password: string; referral_code: string };
  setForm: React.Dispatch<React.SetStateAction<{ first_name: string; last_name: string; email: string; password: string; referral_code: string }>>;
  onSubmit: (e: React.FormEvent) => void;
  onLogout: () => void;
  loading: boolean;
  error: string;
  orders: Order[];
  ordersLoading: boolean;
  onRefreshOrders: () => void;
  referralData: ReferralData | null;
  referralLoading: boolean;
  onRefreshReferrals: () => void;
  onNotify: (msg: string) => void;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 30-Second Cooldown Timers
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [verifyCooldown, setVerifyCooldown] = useState(0);

  // Countdown intervals
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  useEffect(() => {
    if (verifyCooldown <= 0) return;
    const timer = setInterval(() => {
      setVerifyCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [verifyCooldown]);

  // Forgot password states
  const [forgotMode, setForgotMode] = useState<'none' | 'email' | 'otp' | 'new_password'>('none');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [localFormError, setLocalFormError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Password criteria for registration
  const regHasMinLength = form.password.length >= 8;
  const regHasUppercase = /[A-Z]/.test(form.password);
  const regHasNumber = /[0-9]/.test(form.password);
  const regHasSpecial = /[\W_]/.test(form.password);
  const regPasswordValid = regHasMinLength && regHasUppercase && regHasNumber && regHasSpecial;
  const regPasswordsMatch = form.password === confirmPassword && confirmPassword.length > 0;

  // Password criteria for password reset
  const resetHasMinLength = resetPassword.length >= 8;
  const resetHasUppercase = /[A-Z]/.test(resetPassword);
  const resetHasNumber = /[0-9]/.test(resetPassword);
  const resetHasSpecial = /[\W_]/.test(resetPassword);
  const resetPasswordValid = resetHasMinLength && resetHasUppercase && resetHasNumber && resetHasSpecial;
  const resetPasswordsMatch = resetPassword === resetConfirmPassword && resetConfirmPassword.length > 0;

  function copyToClipboard(text: string, isLink = false) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (isLink) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
      onNotify('Copied to clipboard!');
    }
  }

  function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalFormError('');

    if (!regPasswordValid) {
      setLocalFormError('Password must meet all listed security criteria.');
      return;
    }

    if (form.password !== confirmPassword) {
      setLocalFormError('Passwords do not match. Please recheck.');
      return;
    }

    onSubmit(e);
  }

  // Resend Magic Verification Link with 30s Cooldown
  async function handleResendVerificationLink() {
    if (verifyCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendNotice('');

    try {
      const targetEmail = form.email || forgotEmail;
      const res = await apiRequest('/api/users/resend-verification.php', 'POST', { email: targetEmail });
      setResendNotice(res.message || 'New magic verification link sent to your email.');
      setVerifyCooldown(30);
      onNotify('Verification link sent! Check your inbox.');
    } catch (err: any) {
      setResendNotice(err.message || 'Unable to resend verification link.');
    } finally {
      setResendLoading(false);
    }
  }

  // Forgot password API calls with 30s Cooldown
  async function handleSendForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    if (forgotCooldown > 0 || forgotLoading) return;

    setForgotError('');
    setForgotLoading(true);

    try {
      const res = await apiRequest('/api/users/forgot-password.php', 'POST', { email: forgotEmail });
      setForgotSuccess(res.message || 'Verification code sent to your email.');
      setForgotCooldown(30);
      setForgotMode('otp');
    } catch (err: any) {
      setForgotError(err.message || 'Unable to send password reset code.');
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleVerifyForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    try {
      await apiRequest('/api/users/verify-reset-code.php', 'POST', {
        email: forgotEmail,
        code: forgotOtp.trim(),
      });
      setForgotSuccess('Verification successful. Please enter your new password.');
      setForgotMode('new_password');
    } catch (err: any) {
      setForgotError(err.message || 'Invalid or expired verification code.');
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError('');

    if (!resetPasswordValid) {
      setForgotError('New password must satisfy all 4 criteria.');
      return;
    }

    if (!resetPasswordsMatch) {
      setForgotError('New passwords do not match.');
      return;
    }

    setForgotLoading(true);

    try {
      const res = await apiRequest('/api/users/reset-password.php', 'POST', {
        email: forgotEmail,
        code: forgotOtp.trim(),
        new_password: resetPassword,
      });

      onNotify(res.message || 'Password updated successfully! Please sign in.');
      setForgotMode('none');
      setMode('login');
      setForm((prev) => ({ ...prev, email: forgotEmail, password: '' }));
      setForgotEmail('');
      setForgotOtp('');
      setResetPassword('');
      setResetConfirmPassword('');
      setForgotSuccess('');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to update password.');
    } finally {
      setForgotLoading(false);
    }
  }

  if (user) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://shopit-users.vercel.app';
    const refCode = referralData?.referral_code || user.referral_code || '';
    const refLink = refCode ? `${origin}/?ref=${refCode}` : '';

    return (
      <section className="mx-auto max-w-[1440px] px-3 sm:px-5 py-8 md:py-14 space-y-10">
        <div className="flex flex-col justify-between gap-5 border-b border-[#14212b]/15 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a4e2c]">Account & Rewards Hub</p>
            <h1 className="mt-1 text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Welcome, {user.first_name || 'Customer'}.
            </h1>
          </div>
          <button
            onClick={onLogout}
            className="self-start md:self-auto inline-flex items-center gap-2 border border-[#9a4e2c]/30 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#9a4e2c] hover:bg-[#9a4e2c] hover:text-[#f5f5f1] cursor-pointer transition-colors"
          >
            <LogOut className="size-3.5" /> Sign Out
          </button>
        </div>

        {/* Profile + Referral Sharing Card */}
        <div className="grid gap-6 lg:grid-cols-[.6fr_1.4fr]">
          {/* User Profile Card */}
          <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a4e2c]">Wholesale Profile</p>
              <h2 className="mt-3 text-xl sm:text-2xl font-black">{user.first_name} {user.last_name}</h2>
              <p className="mt-1 text-xs text-[#14212b]/60 font-mono">{user.email}</p>
              <div className="mt-6 pt-6 border-t border-[#14212b]/15 text-xs text-[#14212b]/60 space-y-1.5">
                <p><strong className="text-[#14212b]">Account ID:</strong> #{user.user_id}</p>
                <p><strong className="text-[#14212b]">Membership:</strong> Active Trade Customer</p>
                <p><strong className="text-[#14212b]">Currency:</strong> Nigerian Naira (₦)</p>
              </div>
            </div>
          </div>

          {/* Referral Program Card */}
          <div className="border border-[#14212b] bg-[#14212b] text-[#f5f5f1] p-5 sm:p-7 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f5f5f1]/15 pb-4">
              <div className="flex items-center gap-2">
                <Gift className="size-5 text-[#e0ee56]" />
                <h3 className="font-black uppercase tracking-tight text-lg sm:text-xl text-[#e0ee56]">
                  Invite Friends & Earn 5% Off
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider bg-[#e0ee56] text-[#14212b] px-2 py-0.5 font-bold">
                Unlimited Referrals
              </span>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-[#f5f5f1]/80 leading-relaxed">
              Share your personal referral code or link. When friends join ShopIt, you earn a <strong>5% OFF</strong> coupon!
              <span className="block mt-1 text-[11px] text-[#e0ee56]/90 font-medium">
                * Note: All coupons require a minimum checkout of 3 products.
              </span>
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Code Box */}
              <div className="bg-[#1f3342] p-3.5 border border-[#f5f5f1]/15">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#f5f5f1]/50 block mb-1">
                  Your Referral Code
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-black text-base text-[#e0ee56]">
                    {refCode || 'GENERATING...'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(refCode)}
                    disabled={!refCode}
                    className="inline-flex items-center gap-1 bg-[#e0ee56] text-[#14212b] px-2.5 py-1 text-[11px] font-black uppercase hover:bg-white transition-colors cursor-pointer"
                  >
                    {copiedCode ? <CheckCheck className="size-3" /> : <Copy className="size-3" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Link Box */}
              <div className="bg-[#1f3342] p-3.5 border border-[#f5f5f1]/15">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#f5f5f1]/50 block mb-1">
                  Your Direct Invite Link
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-[#e0ee56] truncate max-w-[180px] sm:max-w-[200px]">
                    {refLink || 'GENERATING...'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(refLink, true)}
                    disabled={!refLink}
                    className="inline-flex items-center gap-1 bg-[#e0ee56] text-[#14212b] px-2.5 py-1 text-[11px] font-black uppercase hover:bg-white transition-colors cursor-pointer shrink-0"
                  >
                    {copiedLink ? <CheckCheck className="size-3" /> : <Share2 className="size-3" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coupons Hub */}
        <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#14212b]/15 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Ticket className="size-5 text-[#9a4e2c]" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                My Rewards & Coupons ({referralData?.coupons?.length || 0})
              </h2>
            </div>
            <p className="text-xs text-[#14212b]/60">
              Coupons apply automatically or can be copied to checkout.
            </p>
          </div>

          {referralLoading && !referralData ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-[#f5f5f1] border border-[#14212b]/10 space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ))}
            </div>
          ) : !referralData?.coupons || referralData.coupons.length === 0 ? (
            <div className="bg-[#f5f5f1] p-8 text-center border border-dashed border-[#14212b]/20">
              <Ticket className="size-8 mx-auto text-[#14212b]/30 mb-2" />
              <p className="text-xs font-bold text-[#14212b]/70">No active coupons available yet.</p>
              <p className="text-[11px] text-[#14212b]/50 mt-1">
                Share your referral code above to earn 5% discount coupons on every successful friend signup!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {referralData.coupons.map((cp) => {
                const expiryInfo = formatCouponExpiry(cp.expires_at, cp.is_used, cp.is_expired);
                const isUsable = Number(cp.is_used) === 0 && !cp.is_expired;

                return (
                  <div
                    key={cp.coupon_id}
                    className={'p-4 border transition-all ' + (isUsable ? 'border-[#14212b] bg-[#f5f5f1] shadow-md' : 'border-[#14212b]/10 bg-[#f5f5f1]/50 opacity-60')}
                  >
                    <div className="flex items-center justify-between">
                      <span className={'px-2 py-0.5 text-[10px] font-black uppercase font-mono ' + (isUsable ? 'bg-[#9a4e2c] text-[#f5f5f1]' : 'bg-[#14212b]/20 text-[#14212b]/60')}>
                        {cp.discount_percent}% OFF
                      </span>
                      <span className={'text-[10px] font-bold ' + (expiryInfo.urgent ? 'text-red-600 animate-pulse' : 'text-[#14212b]/60')}>
                        {expiryInfo.text}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border border-dashed border-[#14212b]/20 bg-white p-2">
                      <span className="font-mono font-black text-sm text-[#14212b]">{cp.code}</span>
                      {isUsable && (
                        <button
                          onClick={() => copyToClipboard(cp.code)}
                          className="text-[10px] font-bold text-[#9a4e2c] hover:underline cursor-pointer uppercase"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Referred Users + Order History */}
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          {/* Referred List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <Users2 className="size-5 text-[#9a4e2c]" /> My Referrals ({referralData?.referrals_count || 0})
              </h2>
            </div>

            <div className="overflow-x-auto border border-[#14212b]/15 bg-[#f5f5f1]">
              <table className="w-full min-w-[360px] text-left text-xs">
                <thead className="bg-[#e8e8e1] text-[10px] font-black uppercase tracking-[.14em] text-[#14212b]/60 border-b border-[#14212b]/15">
                  <tr>
                    <th className="p-3">Friend / Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Date Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14212b]/10">
                  {referralLoading && !referralData ? (
                    <>
                      {[1, 2].map((i) => (
                        <tr key={i}>
                          <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                        </tr>
                      ))}
                    </>
                  ) : !referralData?.referrals || referralData.referrals.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-xs text-[#14212b]/50">
                        No friends have signed up with your link yet. Share your code above!
                      </td>
                    </tr>
                  ) : (
                    referralData.referrals.map((ref, idx) => (
                      <tr key={idx} className="hover:bg-[#e8e8e1]/40">
                        <td className="p-3 font-bold">{ref.name}</td>
                        <td className="p-3 font-mono text-[#14212b]/70">{ref.masked_email}</td>
                        <td className="p-3 text-[#14212b]/60">{ref.joined_date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Orders History List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">My Order History</h2>
              <button
                onClick={onRefreshOrders}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#9a4e2c] hover:underline cursor-pointer"
              >
                <RefreshCw className={'size-3 ' + (ordersLoading ? 'animate-spin' : '')} /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto border border-[#14212b]/15 bg-[#f5f5f1]">
              <table className="w-full min-w-[360px] text-left text-xs">
                <thead className="bg-[#e8e8e1] text-[10px] font-black uppercase tracking-[.14em] text-[#14212b]/60 border-b border-[#14212b]/15">
                  <tr>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Total (₦)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14212b]/10">
                  {ordersLoading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <tr key={i}>
                          <td className="p-3"><Skeleton className="h-4 w-12" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                          <td className="p-3 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                        </tr>
                      ))}
                    </>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs text-[#14212b]/50">No orders placed yet.</td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const isExpanded = Number(expandedOrderId) === Number(o.order_id);
                      return (
                        <React.Fragment key={o.order_id}>
                          <tr
                            onClick={() => setExpandedOrderId(isExpanded ? null : Number(o.order_id))}
                            className="hover:bg-[#e8e8e1]/60 cursor-pointer transition-colors"
                          >
                            <td className="p-3 font-black">#{o.order_id}</td>
                            <td className="p-3 text-[#14212b]/60">{o.order_date}</td>
                            <td className="p-3 font-black">{money(o.total_amount)}</td>
                            <td className="p-3">
                              <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase bg-[#d1fae5] text-[#065f46]">
                                {o.order_status}
                              </span>
                            </td>
                            <td className="p-3 text-right text-[#9a4e2c] font-bold text-[11px]">
                              {isExpanded ? 'Hide ▲' : 'View ▼'}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-[#e8e8e1]/40">
                              <td colSpan={5} className="p-4 border-t border-b border-[#14212b]/10">
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a4e2c]">
                                    Items in Order #{o.order_id}:
                                  </p>
                                  {o.items && o.items.length > 0 ? (
                                    <div className="divide-y divide-[#14212b]/10 border border-[#14212b]/10 bg-white">
                                      {o.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                                          <span className="font-bold text-[#14212b] truncate max-w-[200px]">
                                            {item.product_name}
                                          </span>
                                          <div className="flex items-center gap-3 font-mono text-[11px]">
                                            <span className="text-[#14212b]/60">Qty: {item.quantity}</span>
                                            <span className="font-bold text-[#9a4e2c]">{money(item.unit_price)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-[#14212b]/60">Standard wholesale items.</p>
                                  )}
                                  {o.shipping_address && (
                                    <p className="text-[11px] text-[#14212b]/70 pt-1">
                                      <strong>Delivery Address:</strong> {o.shipping_address}
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 sm:px-5 py-12 sm:py-20">
      <div className="text-center mb-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a4e2c]">Welcome to ShopIt</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black uppercase tracking-tight">
          {mode === 'verify_notice' ? 'Activate Account' : forgotMode !== 'none' ? 'Account Recovery' : 'Account Access'}
        </h1>
      </div>

      <div className="border border-[#14212b]/20 bg-[#e8e8e1] p-6 sm:p-8 shadow-xl">
        {mode !== 'verify_notice' && forgotMode === 'none' && (
          <div className="flex border-b border-[#14212b]/15 mb-6">
            <button
              onClick={() => { setMode('login'); setLocalFormError(''); }}
              className={'flex-1 pb-3 text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ' + (mode === 'login' ? 'border-b-2 border-[#9a4e2c] text-[#14212b]' : 'text-[#14212b]/40 hover:text-[#14212b]')}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setLocalFormError(''); }}
              className={'flex-1 pb-3 text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ' + (mode === 'register' ? 'border-b-2 border-[#9a4e2c] text-[#14212b]' : 'text-[#14212b]/40 hover:text-[#14212b]')}
            >
              Create Account
            </button>
          </div>
        )}

        {(error || localFormError) && mode !== 'verify_notice' && forgotMode === 'none' && (
          <div className="mb-6 flex items-start gap-2 bg-[#fee2e2] border border-[#991b1b]/20 p-3 text-xs text-[#991b1b]">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <p>{localFormError || error}</p>
          </div>
        )}

        {forgotError && forgotMode !== 'none' && (
          <div className="mb-6 flex items-start gap-2 bg-[#fee2e2] border border-[#991b1b]/20 p-3 text-xs text-[#991b1b]">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <p>{forgotError}</p>
          </div>
        )}

        {forgotSuccess && forgotMode !== 'none' && (
          <div className="mb-6 flex items-start gap-2 bg-emerald-50 border border-emerald-600/20 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
            <p>{forgotSuccess}</p>
          </div>
        )}

        {/* --- 1. MAGIC LINK VERIFICATION NOTICE VIEW --- */}
        {mode === 'verify_notice' && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="size-14 rounded-full bg-[#14212b] grid place-items-center text-[#e0ee56] shadow-lg mb-1">
              <Mail className="size-7" />
            </div>

            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#14212b]">
                Magic Link Sent!
              </h2>
              <p className="mt-1 text-xs text-[#14212b]/70 max-w-xs mx-auto leading-relaxed">
                We've sent a magic activation link to:
              </p>
              <div className="mt-2 bg-[#f5f5f1] border border-[#14212b]/20 px-3 py-2 text-xs font-mono font-bold text-[#14212b]">
                {form.email}
              </div>
            </div>

            <div className="bg-[#f5f5f1] border border-[#14212b]/15 p-4 text-left text-xs text-[#14212b]/80 space-y-1.5 w-full">
              <p className="font-bold text-[#14212b] flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#9a4e2c]" /> How it works:
              </p>
              <p>1. Open the email in your inbox from <strong>ShopIt Commerce</strong>.</p>
              <p>2. Click the <strong>"Verify & Activate Account"</strong> button.</p>
              <p>3. You will be automatically authenticated with your rewards unlocked!</p>
            </div>

            {resendNotice && (
              <div className="w-full text-xs font-bold p-3 bg-emerald-50 border border-emerald-600/20 text-emerald-800 text-center">
                {resendNotice}
              </div>
            )}

            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                type="button"
                onClick={handleResendVerificationLink}
                disabled={verifyCooldown > 0 || resendLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#14212b] py-3.5 text-xs font-black uppercase tracking-wider text-[#e0ee56] hover:bg-[#14212b]/90 disabled:opacity-50 cursor-pointer shadow-md transition-all"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Sending Link...</span>
                  </>
                ) : verifyCooldown > 0 ? (
                  <span>Resend link in {verifyCooldown}s</span>
                ) : (
                  <>
                    <RefreshCw className="size-3.5" />
                    <span>Resend Verification Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); setResendNotice(''); }}
                className="w-full py-2.5 text-xs font-bold text-[#14212b]/70 hover:text-[#14212b] cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* --- 2. SIGN IN & REGISTRATION FORMS --- */}
        {mode !== 'verify_notice' && forgotMode === 'none' && (
          <form onSubmit={mode === 'register' ? handleRegisterSubmit : onSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">First Name</label>
                  <input
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    placeholder="First name"
                    className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2 text-xs outline-none focus:border-[#9a4e2c]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">Last Name</label>
                  <input
                    required
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    placeholder="Last name"
                    className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2 text-xs outline-none focus:border-[#9a4e2c]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="yourname@gmail.com"
                className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2 text-xs outline-none focus:border-[#9a4e2c]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(form.email);
                      setForgotError('');
                      setForgotSuccess('');
                      setForgotMode('email');
                    }}
                    className="text-[11px] font-bold text-[#9a4e2c] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2 pr-10 text-xs outline-none focus:border-[#9a4e2c]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#14212b]/60 hover:text-[#14212b]"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Password Criteria Checklist (on Register) */}
            {mode === 'register' && (
              <div className="bg-[#f5f5f1] border border-[#14212b]/15 p-3 text-xs flex flex-col gap-1.5">
                <p className="font-bold text-[10px] uppercase tracking-wider text-[#14212b]/70">Password Requirements</p>
                <div className="flex items-center gap-2">
                  {regHasMinLength ? <Check className="size-3.5 text-emerald-600 font-black" /> : <X className="size-3.5 text-red-500" />}
                  <span className={regHasMinLength ? 'text-emerald-700 font-semibold' : 'text-[#14212b]/60'}>Minimum 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  {regHasUppercase ? <Check className="size-3.5 text-emerald-600 font-black" /> : <X className="size-3.5 text-red-500" />}
                  <span className={regHasUppercase ? 'text-emerald-700 font-semibold' : 'text-[#14212b]/60'}>At least one uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  {regHasNumber ? <Check className="size-3.5 text-emerald-600 font-black" /> : <X className="size-3.5 text-red-500" />}
                  <span className={regHasNumber ? 'text-emerald-700 font-semibold' : 'text-[#14212b]/60'}>At least one number</span>
                </div>
                <div className="flex items-center gap-2">
                  {regHasSpecial ? <Check className="size-3.5 text-emerald-600 font-black" /> : <X className="size-3.5 text-red-500" />}
                  <span className={regHasSpecial ? 'text-emerald-700 font-semibold' : 'text-[#14212b]/60'}>At least one special character</span>
                </div>
              </div>
            )}

            {/* Confirm Password (on Register) */}
            {mode === 'register' && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2 pr-10 text-xs outline-none focus:border-[#9a4e2c]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#14212b]/60 hover:text-[#14212b]"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    {regPasswordsMatch ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium text-[11px]">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <X className="size-3.5 text-red-500" />
                        <span className="text-red-600 font-medium text-[11px]">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-3">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#9a4e2c] mb-1 flex items-center gap-1.5">
                  <Gift className="size-3 text-[#9a4e2c]" /> Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={form.referral_code}
                  onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SHOP-A1B2C3"
                  className="w-full border border-[#14212b]/20 bg-white px-3 py-2 text-xs font-mono font-bold outline-none focus:border-[#9a4e2c]"
                />
                <p className="mt-1 text-[10px] text-[#14212b]/60">
                  Entering a referral code grants you a <strong>20% discount coupon</strong> for your first order with 3+ items!
                </p>
              </div>
            )}

            <button
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 bg-[#14212b] py-3.5 text-xs font-black uppercase tracking-[.15em] text-[#e0ee56] disabled:opacity-50 cursor-pointer hover:bg-[#14212b]/90 transition-all shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{mode === 'register' ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : mode === 'register' ? (
                'Create Account & Get Rewards'
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {/* --- 3. FORGOT PASSWORD STEP 1: ENTER EMAIL --- */}
        {forgotMode === 'email' && (
          <form onSubmit={handleSendForgotOtp} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">
                Enter Your Registered Email
              </label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2.5 text-xs outline-none focus:border-[#9a4e2c]"
              />
              <p className="mt-1.5 text-[11px] text-[#14212b]/60">
                We'll dispatch a 6-digit verification code to reset your account password.
              </p>
            </div>

            <button
              type="submit"
              disabled={forgotCooldown > 0 || forgotLoading}
              className="mt-2 flex items-center justify-center gap-2 bg-[#14212b] py-3 text-xs font-black uppercase tracking-wider text-[#e0ee56] hover:bg-[#14212b]/90 cursor-pointer shadow-md disabled:opacity-50"
            >
              {forgotLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : forgotCooldown > 0 ? (
                <span>Resend in {forgotCooldown}s</span>
              ) : (
                <>
                  <KeyRound className="size-4" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setForgotMode('none')}
              className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-[#14212b]/70 hover:text-[#14212b] cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> Back to Sign In
            </button>
          </form>
        )}

        {/* --- 4. FORGOT PASSWORD STEP 2: ENTER OTP --- */}
        {forgotMode === 'otp' && (
          <form onSubmit={handleVerifyForgotOtp} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-3 text-center text-lg font-mono font-bold tracking-[0.25em] outline-none focus:border-[#9a4e2c]"
              />
              <p className="mt-1.5 text-[11px] text-[#14212b]/60">
                Enter the 6-digit code sent to <strong>{forgotEmail}</strong>.
              </p>
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              className="mt-2 flex items-center justify-center gap-2 bg-[#14212b] py-3 text-xs font-black uppercase tracking-wider text-[#e0ee56] hover:bg-[#14212b]/90 cursor-pointer shadow-md disabled:opacity-50"
            >
              {forgotLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              <span>{forgotLoading ? 'Verifying Code...' : 'Verify Code'}</span>
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleSendForgotOtp}
                disabled={forgotCooldown > 0 || forgotLoading}
                className="font-bold text-[#9a4e2c] hover:underline disabled:opacity-50 cursor-pointer"
              >
                {forgotCooldown > 0 ? `Resend code in ${forgotCooldown}s` : 'Resend Code'}
              </button>

              <button
                type="button"
                onClick={() => setForgotMode('email')}
                className="flex items-center gap-1 font-bold text-[#14212b]/70 hover:text-[#14212b] cursor-pointer"
              >
                <ArrowLeft className="size-3.5" /> Change Email
              </button>
            </div>
          </form>
        )}

        {/* --- 5. FORGOT PASSWORD STEP 3: SET NEW PASSWORD --- */}
        {forgotMode === 'new_password' && (
          <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2 pr-10 text-xs outline-none focus:border-[#9a4e2c]"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#14212b]/60 hover:text-[#14212b]"
                >
                  {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Password Criteria Checklist */}
            <div className="bg-[#f5f5f1] border border-[#14212b]/15 p-3 text-xs flex flex-col gap-1.5">
              <p className="font-bold text-[10px] uppercase tracking-wider text-[#14212b]/70">Password Requirements</p>
              <div className="flex items-center gap-2">
                {resetHasMinLength ? <Check className="size-3.5 text-emerald-600 font-black" /> : <X className="size-3.5 text-red-500" />}
                <span className={resetHasMinLength ? 'text-emerald-700 font-semibold' : 'text-[#14212b]/60'}>Minimum 8 characters</span>
              </div>
              <div className="flex items-center gap-2">
                {resetHasUppercase ? <Check className="size-3.5 text-emerald-600 font-black" /> : <X className="size-3.5 text-red-500" />}
                <span className={resetHasUppercase ? 'text-emerald-700 font-semibold' : 'text-[#14212b]/60'}>At least one uppercase letter</span>
              </div>
              <div className="flex items-center gap-2">
                {resetHasNumber ? <Check className="size-3.5 text-emerald-600 font-black" /> : <X className="size-3.5 text-red-500" />}
                <span className={resetHasNumber ? 'text-emerald-700 font-semibold' : 'text-[#14212b]/60'}>At least one number</span>
              </div>
              <div className="flex items-center gap-2">
                {resetHasSpecial ? <Check className="size-3.5 text-emerald-600 font-black" /> : <X className="size-3.5 text-red-500" />}
                <span className={resetHasSpecial ? 'text-emerald-700 font-semibold' : 'text-[#14212b]/60'}>At least one special character</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showResetConfirmPassword ? 'text' : 'password'}
                  required
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2 pr-10 text-xs outline-none focus:border-[#9a4e2c]"
                />
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#14212b]/60 hover:text-[#14212b]"
                >
                  {showResetConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {resetConfirmPassword.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {resetPasswordsMatch ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium text-[11px]">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X className="size-3.5 text-red-500" />
                      <span className="text-red-600 font-medium text-[11px]">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              className="mt-2 flex items-center justify-center gap-2 bg-[#14212b] py-3 text-xs font-black uppercase tracking-wider text-[#e0ee56] hover:bg-[#14212b]/90 cursor-pointer shadow-md disabled:opacity-50"
            >
              {forgotLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              <span>{forgotLoading ? 'Updating Password...' : 'Reset & Save Password'}</span>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function AboutView({
  stats,
  onBrowseProducts,
  onBrowseCategories,
}: {
  stats: PlatformStats | null;
  onBrowseProducts: () => void;
  onBrowseCategories: () => void;
}) {
  return (
    <div className="flex flex-col gap-16 py-8">
      {/* 1. About Hero */}
      <section className="relative overflow-hidden bg-[#14212b] px-4 sm:px-6 py-16 sm:py-24 text-[#f5f5f1]">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-4 inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#e0ee56]">
            <span>About ShopIt Commerce</span>
          </div>

          <h1 className="max-w-4xl text-[clamp(2.5rem,6vw,5.5rem)] font-black uppercase leading-[.9] tracking-[-0.07em]">
            Direct Commerce.<br />
            <span className="text-[#e0ee56]">Pure Transparency.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-white/75">
            ShopIt is Nigeria's direct-to-consumer and business-to-business commerce hub, established to eliminate opaque middlemen markups and deliver genuine quality products across the country at honest Nigerian Naira (₦) prices.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button
              onClick={onBrowseProducts}
              className="flex items-center gap-3 bg-[#e0ee56] text-[#14212b] px-6 py-4 text-xs font-black uppercase tracking-[0.15em] hover:bg-[#d4e24a] cursor-pointer shadow-xl transition-transform hover:scale-[1.02]"
            >
              Explore Catalog <ArrowRight className="size-4" />
            </button>
            <button
              onClick={onBrowseCategories}
              className="border border-white/30 text-white px-6 py-4 text-xs font-black uppercase tracking-[0.15em] hover:bg-white/10 cursor-pointer"
            >
              View 10 Categories
            </button>
          </div>
        </div>
      </section>

      {/* 2. Our Mission & Story */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a4e2c]">Our Purpose</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-[-0.05em] text-[#14212b]">
              Bridging the gap between manufacturers and Nigerian buyers
            </h2>
            <p className="mt-6 text-sm sm:text-base leading-relaxed text-[#14212b]/80">
              Founded with the belief that purchasing essential provisions, office stationery, industrial tools, solar equipment, and electronics should be seamless and dependable, ShopIt eliminates counterfeit risks by working directly with accredited manufacturers and primary distributors.
            </p>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#14212b]/80">
              Whether you are an individual stocking up household food stuff, an enterprise equipping a corporate office, or an artisan sourcing precision equipment, ShopIt guarantees verified stock and same-day handling.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-6 text-center sm:text-left">
              <p className="text-3xl sm:text-4xl font-black text-[#9a4e2c]">{stats ? stats.orders_delivered : 0}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wider text-[#14212b]">Orders Delivered</p>
              <p className="mt-2 text-[11px] text-[#14212b]/60">Live fulfilled orders recorded in system database.</p>
            </div>
            <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-6 text-center sm:text-left">
              <p className="text-3xl sm:text-4xl font-black text-[#14212b]">{stats ? stats.total_products : 37}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wider text-[#14212b]">Verified Products</p>
              <p className="mt-2 text-[11px] text-[#14212b]/60">Active SKUs available for immediate dispatch.</p>
            </div>
            <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-6 text-center sm:text-left">
              <p className="text-3xl sm:text-4xl font-black text-[#14212b]">{stats ? stats.total_categories : 10}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wider text-[#14212b]">Product Categories</p>
              <p className="mt-2 text-[11px] text-[#14212b]/60">From food staples and groceries to solar &amp; machinery.</p>
            </div>
            <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-6 text-center sm:text-left">
              <p className="text-3xl sm:text-4xl font-black text-[#9a4e2c]">{stats ? stats.total_subscribers : 6}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wider text-[#14212b]">Trade Subscribers</p>
              <p className="mt-2 text-[11px] text-[#14212b]/60">Active buyers receiving trade alerts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 4 ShopIt Guarantees */}
      <section className="border-y border-[#14212b]/15 bg-[#e8e8e1] py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a4e2c]">Our Core Pillars</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-[-0.05em] text-[#14212b]">
              Why Nigerians Choose ShopIt
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-6 space-y-3">
              <div className="grid size-10 place-items-center bg-[#14212b] text-[#e0ee56]">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight">Direct Authenticity</h3>
              <p className="text-xs text-[#14212b]/70 leading-relaxed">
                Direct procurement from verified brand distributors protects your purchases from substandard alternatives.
              </p>
            </div>

            <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-6 space-y-3">
              <div className="grid size-10 place-items-center bg-[#14212b] text-[#e0ee56]">
                <Truck className="size-5" />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight">Express Fulfillment</h3>
              <p className="text-xs text-[#14212b]/70 leading-relaxed">
                Orders dispatched swiftly with real-time tracking, secure protective packaging, and delivery guarantees.
              </p>
            </div>

            <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-6 space-y-3">
              <div className="grid size-10 place-items-center bg-[#14212b] text-[#e0ee56]">
                <Zap className="size-5" />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight">Wholesale &amp; Retail</h3>
              <p className="text-xs text-[#14212b]/70 leading-relaxed">
                Whether you order 1 piece or 50 cartons, you benefit from transparent volume rates and instant checkouts.
              </p>
            </div>

            <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-6 space-y-3">
              <div className="grid size-10 place-items-center bg-[#14212b] text-[#e0ee56]">
                <Building2 className="size-5" />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight">Corporate Services</h3>
              <p className="text-xs text-[#14212b]/70 leading-relaxed">
                Official invoices, bulk procurement support, and tailored trade terms for businesses and institutions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Company Information & Contact */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 pb-8">
        <div className="border border-[#14212b]/20 bg-[#14212b] text-[#f5f5f1] p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e0ee56]">Corporate HQ</p>
              <h3 className="mt-1 text-xl font-black text-white uppercase">ShopIt Commerce Ltd</h3>
              <p className="mt-3 text-xs text-white/70 leading-relaxed">
                Registered in Nigeria under RC No. 1894022-NG.<br />
                Commercial Towers, Plot 14, Victoria Island, Lagos, Nigeria.
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e0ee56]">Operating Hours</p>
              <h3 className="mt-1 text-xl font-black text-white uppercase">Monday – Saturday</h3>
              <p className="mt-3 text-xs text-white/70 leading-relaxed">
                Order Processing: 8:00 AM – 6:00 PM WAT<br />
                Customer Support: 24/7 via support@shopit.co
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e0ee56]">Ready to Shop?</p>
              <h3 className="mt-1 text-xl font-black text-white uppercase">Start Order Now</h3>
              <button
                onClick={onBrowseProducts}
                className="mt-4 inline-flex items-center gap-2 bg-[#e0ee56] text-[#14212b] px-5 py-3 text-xs font-black uppercase tracking-wider hover:bg-[#d4e24a] cursor-pointer"
              >
                Browse All Products <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
