export interface ProductVariation {
  id: string | number;
  product_id: string | number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  min_stock: number;
}

export interface Product {
  id: string | number;
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
  id: string | number;
  username: string;
  role: 'admin' | 'client';
  full_name?: string;
  email?: string;
  phone?: string;
  is_guest?: boolean;
}

export interface StockHistory {
  id: string | number;
  product_id: string | number;
  variation_id?: string | number;
  change_amount: number;
  new_quantity: number;
  reason: string;
  created_at: string;
}

export interface Order {
  id: string | number;
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
  id: string | number;
  order_id: string | number;
  product_id: string | number;
  variation_id?: string | number;
  variation_name?: string;
  variation_sku?: string;
  quantity: number;
  price_at_order: number;
  product_name?: string;
  product_sku?: string;
  product_image?: string;
}
