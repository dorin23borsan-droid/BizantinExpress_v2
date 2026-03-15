export type OrderStatus = 'pending' | 'assigned' | 'completed';
export type OrderType = 'city' | 'suburb';

export interface Order {
  id: number;
  merchant_id: number;
  merchant_name: string;
  merchant_phone: string;
  delivery_address: string;
  recipient_name: string;
  intercom: string;
  type: OrderType;
  distance: number;
  price: number;
  status: OrderStatus;
  runner_id?: string;
  delivery_photo?: string;
  delivery_slot?: string;
  delivery_date?: string;
  created_at: string;
}

export interface Message {
  id: number;
  user_id: number;
  username: string;
  role: string;
  content: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  role: 'merchant' | 'runner' | 'admin';
  name: string;
}
