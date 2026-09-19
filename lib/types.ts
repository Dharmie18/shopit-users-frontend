export type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
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
  order_status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  shipping_address: string;
  items?: OrderItem[];
};

export type CartLine = {
  product_id: number;
  product: Product;
  quantity: number;
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
