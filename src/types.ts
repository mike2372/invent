export interface ProductVariation {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  min_stock: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  min_stock: number;
  unit_of_measure: string;
  image_url?: string;
  updated_at: string;
  has_variations: boolean;
  variations?: ProductVariation[];
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'client';
  full_name?: string;
  email?: string;
  phone?: string;
}

export interface StockHistory {
  id: number;
  product_id: number;
  variation_id?: number;
  change_amount: number;
  new_quantity: number;
  reason: string;
  created_at: string;
}

export interface Order {
  id: number;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  total_amount: number;
  created_at: string;
  items?: OrderItem[];
  cancellation_reason?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  variation_id?: number;
  variation_name?: string;
  variation_sku?: string;
  quantity: number;
  price_at_order: number;
  product_name?: string;
  product_sku?: string;
  product_image?: string;
}
