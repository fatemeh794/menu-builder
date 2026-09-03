export type OrderStatus =
  'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderItemOption {
  option_group_name: string;
  option_name: string;
  extra_price: number;
}

export interface OrderItem {
  id: string;
  menu_item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  options: OrderItemOption[];
}

export interface Order {
  id: string;
  secure_order_token: string;
  restaurant_name: string;
  restaurant_slug: string;
  table_label: string | null;
  customer_name: string;
  customer_phone: string;
  note: string;
  status: OrderStatus;
  total_amount: number;
  is_paid: boolean;
  items: OrderItem[];
  created_at: string;
}

export interface OrderListItem {
  id: string;
  table_label: string | null;
  customer_name: string;
  status: OrderStatus;
  total_amount: number;
  item_count: number;
  created_at: string;
}

export interface CreateOrderItemPayload {
  menu_item_id: string;
  quantity: number;
  option_ids: string[];
}

export interface CreateOrderPayload {
  restaurant_slug: string;
  table_token: string;
  customer_name: string;
  customer_phone: string;
  note?: string;
  items: CreateOrderItemPayload[];
}
