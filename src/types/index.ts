export interface InventoryItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  category: string;
  lowStockThreshold: number;
  price: number;
  dateCreated: string;
}

export interface InventoryUpdateHistory {
  id: string;
  itemId: string;
  productName: string;
  unit: string;
  operation: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  changedAt: string;
}

export interface ExpenseData {
  month: string;
  amount: number;
}

export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface UsageRecord {
  id: string;
  patientConsent: boolean;
  patientName: string;
  patientId: string;
  procedure: string;
  date: string;
  items: UsageItem[];
  recordedBy: string;
  notes?: string;
}

export interface UsageItem {
  productId: string;
  productName: string;
  quantityUsed: number;
  unit: string;
}

// Simple usage record for staff (without patient details)
export interface SimpleUsageRecord {
  id: string;
  date: string;
  procedure: string;
  patientConsent: boolean;
  patientName: string;
  items: SimpleUsageItem[];
}

export interface SimpleUsageItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
}
