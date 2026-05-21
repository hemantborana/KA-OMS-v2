import { triggerHaptic } from './utils/haptics';

export interface StockItem {
  id: string;
  name: string;
  category: string;
  SKU: string;
  price: number;
  stockQty: number;
}

export interface CartItem {
  id: string;
  name: string;
  SKU: string;
  price: number;
  qty: number;
  note?: string; // Small item note with specific item
}

export interface Order {
  id: string;
  customerName: string;
  date: string;
  items: CartItem[];
  status: 'pending' | 'ready-for-billing' | 'billed';
  totalAmount: number;
  billingSelections?: Record<string, number>; // itemId -> billQty
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff' | 'manager';
  email: string;
}

const INITIAL_STOCK: StockItem[] = [
  { id: '1', name: 'iPhone 15 Pro Max', category: 'Electronics', SKU: 'E-IP15PM', price: 1199, stockQty: 45 },
  { id: '2', name: 'Sony WH-1000XM5', category: 'Electronics', SKU: 'E-XM5', price: 399, stockQty: 30 },
  { id: '3', name: 'MacBook Air M3', category: 'Electronics', SKU: 'E-MACM3', price: 1299, stockQty: 18 },
  { id: '4', name: 'Nike Air Max 270', category: 'Apparel', SKU: 'A-AMAX', price: 150, stockQty: 60 },
  { id: '5', name: 'Stanley Quencher Tumbler', category: 'Kitchenware', SKU: 'K-STAN', price: 45, stockQty: 85 },
  { id: '6', name: 'Logitech MX Master 3S', category: 'Electronics', SKU: 'E-MX3S', price: 99, stockQty: 50 },
  { id: '7', name: 'Dell UltraSharp 27"', category: 'Electronics', SKU: 'E-DELL27', price: 349, stockQty: 15 },
  { id: '8', name: 'Hydro Flask 32oz', category: 'Kitchenware', SKU: 'K-HYDRO32', price: 38, stockQty: 110 }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-1001',
    customerName: 'Hemant Sharma',
    date: '2026-05-20T10:30:00Z',
    items: [
      { id: '1', name: 'iPhone 15 Pro Max', SKU: 'E-IP15PM', price: 1199, qty: 2, note: 'Handle with extreme care, fragile!' },
      { id: '2', name: 'Sony WH-1000XM5', SKU: 'E-XM5', price: 399, qty: 1, note: '' },
      { id: '5', name: 'Stanley Quencher Tumbler', SKU: 'K-STAN', price: 45, qty: 5, note: 'Engrave "PREMIUM" on the side' }
    ],
    status: 'pending',
    totalAmount: 3022,
    billingSelections: {}
  },
  {
    id: 'ORD-1002',
    customerName: 'Sarah Jenkins',
    date: '2026-05-21T08:15:00Z',
    items: [
      { id: '3', name: 'MacBook Air M3', SKU: 'E-MACM3', price: 1299, qty: 1, note: 'Pre-load standard suite software' },
      { id: '6', name: 'Logitech MX Master 3S', SKU: 'E-MX3S', price: 99, qty: 2, note: 'One graphite and one pale grey' }
    ],
    status: 'pending',
    totalAmount: 1497,
    billingSelections: {}
  },
  {
    id: 'ORD-1003',
    customerName: 'Michael Chang',
    date: '2026-05-19T14:45:00Z',
    items: [
      { id: '4', name: 'Nike Air Max 270', SKU: 'A-AMAX', price: 150, qty: 4, note: 'Two US size 10, two US size 11' },
      { id: '8', name: 'Hydro Flask 32oz', SKU: 'K-HYDRO32', price: 38, qty: 10, note: 'Promo bundle pack' }
    ],
    status: 'ready-for-billing',
    totalAmount: 980
  }
];

const INITIAL_USERS: User[] = [
  { id: 'U-1', username: 'hemant_admin', role: 'admin', email: 'HEMANTPB123@gmail.com' },
  { id: 'U-2', username: 'sarah_billing', role: 'manager', email: 'sarah.b@company.com' },
  { id: 'U-3', username: 'jason_staff', role: 'staff', email: 'jason.s@company.com' }
];

export function getStock(): StockItem[] {
  const data = localStorage.getItem('sms_stock');
  if (!data) {
    localStorage.setItem('sms_stock', JSON.stringify(INITIAL_STOCK));
    return INITIAL_STOCK;
  }
  return JSON.parse(data);
}

export function saveStock(stock: StockItem[]) {
  localStorage.setItem('sms_stock', JSON.stringify(stock));
}

export function getOrders(): Order[] {
  const data = localStorage.getItem('sms_orders');
  if (!data) {
    localStorage.setItem('sms_orders', JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }
  return JSON.parse(data);
}

export function saveOrders(orders: Order[]) {
  localStorage.setItem('sms_orders', JSON.stringify(orders));
}

export function getUsers(): User[] {
  const data = localStorage.getItem('sms_users');
  if (!data) {
    localStorage.setItem('sms_users', JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  return JSON.parse(data);
}

export function saveUsers(users: User[]) {
  localStorage.setItem('sms_users', JSON.stringify(users));
}
