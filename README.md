# ShopIt — Users Frontend

> **Direct Retail & Wholesale Marketplace for Nigeria**  
> Modern Next.js App Router frontend connected to a native PHP + MySQL REST API with zero mock data.

---

## Overview

The **ShopIt Users Frontend** provides customers and businesses with a shopping experience for everyday goods, groceries, farm produce, stationery, consumer electronics, solar systems, and industrial workshop tools. All prices, taxes, and settlements are strictly computed in **Nigerian Naira (`₦`)**.

---

## Features

- ** Complete Product Catalog**: 37+ verified products spanning 10 diverse sectors (Food Stuff, Groceries, Stationery, Household, Personal Care, Electronics, Solar Energy, Machinery, Office Fittings, Automotive).
- **🇳🇬 Pure Naira Currency Standard**: Authentic Nigerian pricing formatted with `₦` and standard 7.5% Nigerian VAT on checkout.
- ** Interactive Category Dropdown Filters**: Instant single-click sector filtering without horizontal scroll overflow.
- ** Real-time Database Metrics**: Live stats (Orders Delivered, Active SKUs, Categories, Trade Subscribers) queried directly from `/api/stats/overview.php` without exaggerated figures.
- ** Dedicated "About ShopIt" Page**: Transparent company profile, mission statement, 4 core pillars, Lagos HQ details, and RC verification.
- ** Persistent Floating Home Icon**: Always-present bottom-right button for instant return to the landing page.
- ** Real-time Shopping Bag**: Interactive slide-out cart drawer with quantity adjustments, subtotal calculations, and item removals.
- ** Multi-Method Checkout**: Direct order placement supporting Bank Transfer, Debit Card, and Corporate Invoice.
- ** User Account & Order History**: User registration and login with personal email addresses (`yourname@gmail.com`) and live order tracking.
- ** Trade Newsletter Engine**: Working newsletter subscription box integrated with the backend subscriber database.

---

##  Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom ShopIt palette (`#14212b` Slate, `#e0ee56` Electric Yellow, `#9a4e2c` Terracotta)
- **Icons**: Lucide React
- **Backend API**: PHP 8.x + MySQL via XAMPP

---

##  Getting Started

### 1. Prerequisites
- **Node.js**: v18+ installed
- **XAMPP**: Apache & MySQL services running

### 2. Installation & Setup
```bash
cd "Users Frontend"
npm install
```

### 3. Running the Dev Server
```bash
npm run dev
```
The application will start on **[http://localhost:3000](http://localhost:3000)**.

### 4. Production Build & Validation
```bash
npx tsc --noEmit     # Verify TypeScript types (0 errors)
npm run build        # Build optimized production bundle
npm run start        # Start production server
```

---

##  Project Structure

```
Users Frontend/
├── app/
│   ├── globals.css         # Tailwind directives and theme variables
│   ├── layout.tsx          # Root layout, viewport, metadata, and SVG favicons
│   ├── page.tsx            # Main Single-Page App with Home, Catalog, About, Account & Checkout
│   └── icon.svg            # Branded vector favicon
├── components/
│   └── ui/
│       └── skeleton.tsx    # Shimmer wave skeleton components
├── lib/
│   ├── api.ts              # Centralized fetch wrapper for backend REST API
│   ├── auth.ts             # Client-side session and auth storage
│   ├── types.ts            # TypeScript interfaces (Product, Category, Order, PlatformStats)
│   └── utils.ts            # Currency formatter (₦ Naira) and helper utilities
├── public/
│   └── icon.svg            # Public favicon asset
├── package.json
└── tsconfig.json
```

---

##  Backend API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/products/products.php` | `GET` | Fetch full product catalog |
| `/api/categories/categories.php` | `GET` | Fetch all 10 product categories |
| `/api/stats/overview.php` | `GET` | Fetch live platform statistics |
| `/api/users/register.php` | `POST` | Customer account registration |
| `/api/users/login.php` | `POST` | Customer account authentication |
| `/api/users/profile.php` | `GET` | Retrieve authenticated user profile |
| `/api/checkout/checkout.php` | `POST` | Submit order and process payment |
| `/api/users/orders.php` | `GET` | Fetch past order history for logged-in user |
| `/api/newsletter/subscribe.php` | `POST` | Subscribe email to weekly trade dispatches |
