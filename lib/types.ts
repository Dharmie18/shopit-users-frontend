export type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
  is_verified?: boolean | number;
  referral_code?: string;
  referred_by_id?: number | null;
  created_at?: string;
};


export type Category = {
  category_id: number;
  category_name: string;
  parent_category_id?: number | null;
  image_url?: string;
};

export type Product = {
  product_id: number;
  product_name: string;
  description: string;
  price: number | string;
  stock_quantity: number;
  category_id?: number;
  category_name?: string;
  image_url?: string;
  created_at?: string;
};

export type OrderItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number | string;
};

export type Order = {
  order_id: number | string;
  user_id: number;
  order_date: string;
  total_amount: number | string;
  discount_amount?: number | string;
  coupon_id?: number | null;
  order_status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  shipping_address: string;
  items?: OrderItem[];
};

export type CartLine = {
  product_id: number;
  product_name?: string;
  product: Product;
  quantity: number;
};

export type Coupon = {
  coupon_id: number;
  user_id: number;
  code: string;
  discount_percent: number;
  is_used: number | boolean;
  min_items_required?: number;
  min_items?: number;
  expires_at?: string;
  is_expired?: boolean;
  seconds_left?: number;
  created_at?: string;
  used_at?: string | null;
};

export type ReferredUser = {
  name: string;
  masked_email: string;
  joined_date: string;
};

export type ReferralData = {
  referral_code: string;
  referral_link: string;
  referrals_count: number;
  referrals: ReferredUser[];
  coupons: Coupon[];
  active_coupons: Coupon[];
};

export type NewsletterSubscriber = {
  subscriber_id: number;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribed_at: string;
};

export interface PlatformStats {
  orders_delivered: number;
  total_orders: number;
  total_products: number;
  total_categories: number;
  total_sales_volume: number;
  total_subscribers: number;
}

