'use client';

import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Home,
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
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { saveAuth, getAuthUser, clearAuth, isAuthenticated } from '@/lib/auth';
import { Product, Category, Order, CartLine, User, PlatformStats } from '@/lib/types';
import { money, sleep } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type View = 'home' | 'shop' | 'product' | 'checkout' | 'confirmation' | 'account' | 'about';

export default function Page() {
  const [view, setView] = useState<View>('home');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  // Async States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auth & Account State
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [accountMode, setAccountMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

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
    if (isAuthenticated()) {
      setUser(getAuthUser());
      loadUserProfile();
      loadUserOrders();
    }
  }, []);

  async function loadInitialData() {
    setLoading(true);
    setError('');
    try {
      const [prodData, catData, statsData] = await Promise.all([
        apiRequest<Product[]>('/api/products/products.php'),
        apiRequest<Category[]>('/api/categories/categories.php'),
        apiRequest<PlatformStats>('/api/stats/overview.php').catch(() => null),
        sleep(650),
      ]);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load catalog data');
    } finally {
      setLoading(false);
    }
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
    try {
      const [orders] = await Promise.all([
        apiRequest<Order[]>('/api/users/orders.php', 'GET', undefined, true),
        sleep(600),
      ]);
      setUserOrders(Array.isArray(orders) ? orders : []);
    } catch {
      setUserOrders([]);
    } finally {
      setOrdersLoading(false);
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

  const subtotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const tax = subtotal * 0.075; // 7.5% Nigerian VAT

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (accountMode === 'register') {
        const res = await apiRequest('/api/users/register.php', 'POST', {
          first_name: authForm.first_name,
          last_name: authForm.last_name,
          email: authForm.email,
          password: authForm.password,
        });
        notify(res.message || 'Account registered successfully! Please sign in.');
        setAuthForm({ first_name: '', last_name: '', email: '', password: '' });
        setAccountMode('login');
      } else {
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
        setAuthForm({ first_name: '', last_name: '', email: '', password: '' });
        notify('Logged in successfully.');
        loadUserOrders();
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
    setAuthForm({ first_name: '', last_name: '', email: '', password: '' });
    notify('Logged out successfully.');
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setCheckoutError('');

    if (!isAuthenticated()) {
      setView('account');
      setAccountMode('login');
      setAuthForm({ first_name: '', last_name: '', email: '', password: '' });
      notify('Please sign in or create an account to complete checkout.');
      return;
    }

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const payload = {
        shipping_address: checkoutForm.shipping_address,
        payment_method: checkoutForm.payment_method,
        items: cart.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
        })),
      };

      const result = await apiRequest('/api/checkout/checkout.php', 'POST', payload, true);
      setLastOrderResult({
        order_id: result.order_id,
        total_amount: result.total_amount || (subtotal + tax),
      });
      setCart([]);
      loadUserOrders();
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
              <span className="size-1.5 rounded-full bg-[#e0ee56] animate-pulse" />
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
            <div className="relative hidden max-w-xs flex-1 md:block">
              <Search className="absolute left-3 top-2.5 size-4 text-[#14212b]/50" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (view !== 'shop') setView('shop');
                }}
                placeholder="Search products, brands, categories..."
                className="w-full border border-[#14212b]/20 bg-transparent py-2 pl-9 pr-3 text-xs outline-none placeholder:text-[#14212b]/45 focus:border-[#9a4e2c]"
              />
            </div>

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
              <div className="relative mb-3">
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
              </div>
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
          {error ? (
            <div className="mx-auto max-w-xl my-12 px-4 py-8 border border-[#9a4e2c]/30 bg-[#fee2e2] text-[#991b1b] text-center mx-4 sm:mx-auto">
              <AlertCircle className="size-8 mx-auto mb-3" />
              <h3 className="font-black uppercase tracking-wider text-base">Unable to Load Products</h3>
              <p className="mt-2 text-xs">{error}</p>
              <button
                onClick={loadInitialData}
                className="mt-6 inline-flex items-center gap-2 bg-[#14212b] text-[#e0ee56] px-4 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                <RefreshCw className="size-3.5" /> Refresh Page
              </button>
            </div>
          ) : (
            <>
              {view === 'home' && (
                <HomeView
                  products={products}
                  categories={categories}
                  loading={loading}
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
                  loading={loading}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  search={search}
                  onSearchChange={setSearch}
                  onProduct={openProduct}
                  onAddToCart={addToCart}
                />
              )}

              {view === 'product' && selectedProduct && (
                <ProductDetailView
                  product={selectedProduct}
                  onBack={() => setView('shop')}
                  onAddToCart={addToCart}
                />
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
                    setAuthForm({ first_name: '', last_name: '', email: '', password: '' });
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
            </>
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

      {/* Floating Bottom-Right Home Icon (Always Present on Every Page) */}
      <button
        onClick={() => {
          setView('home');
          setSelectedCategory(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Back to Landing Page"
        title="Go to Home"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-[#14212b] text-[#e0ee56] hover:bg-[#1a2d3c] border-2 border-[#e0ee56] px-4 py-3 sm:px-5 sm:py-3.5 rounded-none shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group"
      >
        <Home className="size-5 text-[#e0ee56] group-hover:-translate-y-0.5 transition-transform" />
        <span className="text-xs font-black uppercase tracking-[0.16em]">Home</span>
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
        {loading ? 'Joining...' : 'Subscribe'}
      </button>
    </form>
  );
}

function HomeView({
  products,
  categories,
  loading,
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
  loading: boolean;
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
              <span className="size-2 rounded-full bg-[#e0ee56] animate-pulse" />
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
                {loading ? <Skeleton className="h-14 w-32 bg-white/20" /> : categories.length + ' Categories'}
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
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </>
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
                className="bg-[#e0ee56] text-[#14212b] px-6 py-3.5 text-xs font-black uppercase tracking-wider hover:bg-[#d4e24a] cursor-pointer disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {newsletterLoading ? 'Subscribing...' : 'Subscribe'}
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
  loading,
  selectedCategory,
  onSelectCategory,
  search,
  onSearchChange,
  onProduct,
  onAddToCart,
}: {
  products: Product[];
  categories: Category[];
  loading: boolean;
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
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </>
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

            <button
              disabled={loading || cart.length === 0}
              className="bg-[#14212b] text-[#e0ee56] py-4 text-xs font-black uppercase tracking-[.16em] disabled:opacity-40 cursor-pointer hover:bg-[#14212b]/90 shadow-xl"
            >
              {loading ? 'Processing Order...' : 'Place Order (₦)'}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="border border-[#14212b]/15 bg-[#f5f5f1] p-5 sm:p-6 h-fit">
          <h3 className="font-black uppercase tracking-tight text-base pb-4 border-b border-[#14212b]/15">
            Order Summary ({cart.reduce((a, b) => a + b.quantity, 0)} Items)
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
            <div className="flex justify-between text-[#14212b]/70">
              <span>VAT (7.5%)</span>
              <span className="font-mono font-black">{money(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-black border-t border-[#14212b]/15 pt-3">
              <span>Total Due (NGN)</span>
              <span className="font-mono text-lg text-[#9a4e2c]">{money(subtotal + tax)}</span>
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
}: {
  user: Partial<User> | null;
  mode: 'login' | 'register';
  setMode: (m: 'login' | 'register') => void;
  form: { first_name: string; last_name: string; email: string; password: string };
  setForm: React.Dispatch<React.SetStateAction<{ first_name: string; last_name: string; email: string; password: string }>>;
  onSubmit: (e: React.FormEvent) => void;
  onLogout: () => void;
  loading: boolean;
  error: string;
  orders: Order[];
  ordersLoading: boolean;
  onRefreshOrders: () => void;
}) {
  if (user) {
    return (
      <section className="mx-auto max-w-[1440px] px-3 sm:px-5 py-8 md:py-14">
        <div className="flex flex-col justify-between gap-5 border-b border-[#14212b]/15 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a4e2c]">Account Dashboard</p>
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div className="border border-[#14212b]/15 bg-[#e8e8e1] p-5 sm:p-6 h-fit">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a4e2c]">User Profile</p>
            <h2 className="mt-3 text-xl sm:text-2xl font-black">{user.first_name} {user.last_name}</h2>
            <p className="mt-1 text-xs text-[#14212b]/60 font-mono">{user.email}</p>
            <div className="mt-6 pt-6 border-t border-[#14212b]/15 text-xs text-[#14212b]/60 space-y-1">
              <p>Account ID: #{user.user_id}</p>
              <p>Status: Active</p>
              <p>Currency: Nigerian Naira (₦)</p>
            </div>
          </div>

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
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-[#e8e8e1] text-[10px] font-black uppercase tracking-[.14em] text-[#14212b]/60 border-b border-[#14212b]/15">
                  <tr>
                    <th className="p-3 sm:p-4">Order ID</th>
                    <th className="p-3 sm:p-4">Date</th>
                    <th className="p-3 sm:p-4">Total (₦)</th>
                    <th className="p-3 sm:p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14212b]/10">
                  {ordersLoading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <tr key={i}>
                          <td className="p-3 sm:p-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="p-3 sm:p-4"><Skeleton className="h-4 w-24" /></td>
                          <td className="p-3 sm:p-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="p-3 sm:p-4"><Skeleton className="h-6 w-20" /></td>
                        </tr>
                      ))}
                    </>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-[#14212b]/50">No orders placed yet.</td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.order_id} className="hover:bg-[#e8e8e1]/40">
                        <td className="p-3 sm:p-4 font-black">#{o.order_id}</td>
                        <td className="p-3 sm:p-4 text-xs text-[#14212b]/60">{o.order_date}</td>
                        <td className="p-3 sm:p-4 font-black">{money(o.total_amount)}</td>
                        <td className="p-3 sm:p-4">
                          <span className="inline-block px-2.5 py-1 text-[10px] font-black uppercase bg-[#d1fae5] text-[#065f46]">
                            {o.order_status}
                          </span>
                        </td>
                      </tr>
                    ))
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
        <h1 className="mt-1 text-3xl sm:text-4xl font-black uppercase tracking-tight">Account Access</h1>
      </div>

      <div className="border border-[#14212b]/20 bg-[#e8e8e1] p-6 sm:p-8 shadow-xl">
        <div className="flex border-b border-[#14212b]/15 mb-6">
          <button
            onClick={() => setMode('login')}
            className={'flex-1 pb-3 text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ' + (mode === 'login' ? 'border-b-2 border-[#9a4e2c] text-[#14212b]' : 'text-[#14212b]/40 hover:text-[#14212b]')}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={'flex-1 pb-3 text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ' + (mode === 'register' ? 'border-b-2 border-[#9a4e2c] text-[#14212b]' : 'text-[#14212b]/40 hover:text-[#14212b]')}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 bg-[#fee2e2] border border-[#991b1b]/20 p-3 text-xs text-[#991b1b]">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#14212b]/70 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full border border-[#14212b]/20 bg-[#f5f5f1] px-3 py-2 text-xs outline-none focus:border-[#9a4e2c]"
            />
          </div>

          <button
            disabled={loading}
            className="mt-4 flex items-center justify-center gap-2 bg-[#14212b] py-3.5 text-xs font-black uppercase tracking-[.15em] text-[#e0ee56] disabled:opacity-50 cursor-pointer hover:bg-[#14212b]/90 transition-all shadow-md"
          >
            {loading ? 'Submitting...' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>
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
