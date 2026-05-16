import { supabase } from '../lib/supabaseClient';
import { InventoryItem, InventoryUpdateHistory } from '../types';

interface InventoryRow {
  inventory_id: number;
  quantity: number;
  item_name: string;
  unit_type: string;
  expiration_date: string | null;
  low_stock_threshold: number;
  price: number;
  created_at: string;
  restocked_by_user_id: number | null;
  last_restocked_at: string | null;
  category: string;
}

interface TransactionLogRow {
  transaction_log_id: number;
  table_name: string;
  row_id: number;
  operation: string;
  before_value: Record<string, any> | null;
  after_value: Record<string, any> | null;
  changed_at: string;
}

function mapInventoryRow(row: InventoryRow): InventoryItem {
  return {
    id: row.inventory_id.toString(),
    productName: row.item_name,
    quantity: row.quantity,
    unit: row.unit_type,
    expiryDate: row.expiration_date || '',
    category: row.category,
    lowStockThreshold: row.low_stock_threshold,
    price: row.price,
    dateCreated: row.created_at.split('T')[0],
  };
}

function mapInventoryItem(item: InventoryItem) {
  return {
    item_name: item.productName,
    quantity: item.quantity,
    unit_type: item.unit,
    expiration_date: item.expiryDate || null,
    category: item.category,
    low_stock_threshold: item.lowStockThreshold,
    price: item.price,
    created_at: item.dateCreated ? new Date(item.dateCreated).toISOString() : new Date().toISOString(),
  };
}

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapInventoryHistoryRow(row: TransactionLogRow): InventoryUpdateHistory {
  const beforeValue = row.before_value || {};
  const afterValue = row.after_value || {};
  const quantityBefore = readNumber(beforeValue.quantity);
  const quantityAfter = readNumber(afterValue.quantity, quantityBefore);
  const productName = String(
    afterValue.item_name ||
    beforeValue.item_name ||
    `Inventory item #${row.row_id}`
  );
  const unit = String(afterValue.unit_type || beforeValue.unit_type || 'units');

  return {
    id: row.transaction_log_id.toString(),
    itemId: row.row_id.toString(),
    productName,
    unit,
    operation: row.operation,
    quantityBefore,
    quantityAfter,
    quantityChange: quantityAfter - quantityBefore,
    changedAt: row.changed_at,
  };
}

export async function getInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data || []) as InventoryRow[]).map(mapInventoryRow);
}

export async function saveInventory(items: InventoryItem[]): Promise<void> {
  const rows = items.map((item) => ({
    ...mapInventoryItem(item),
    ...(item.id ? { inventory_id: Number(item.id) } : {}),
  }));

  const { error } = await supabase
    .from('inventory_items')
    .upsert(rows, { onConflict: 'inventory_id' });

  if (error) {
    throw error;
  }
}

export async function saveInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  if (item.id) {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(mapInventoryItem(item))
      .eq('inventory_id', Number(item.id))
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapInventoryRow(data as InventoryRow);
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .insert(mapInventoryItem(item))
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapInventoryRow(data as InventoryRow);
}

export async function updateInventoryQuantity(
  item: InventoryItem,
  newQuantity: number,
  userId?: string
): Promise<InventoryItem> {
  const restockFields = newQuantity > item.quantity
    ? {
        restocked_by_user_id: userId ? Number(userId) : null,
        last_restocked_at: new Date().toISOString(),
      }
    : {};

  const { data, error } = await supabase
    .from('inventory_items')
    .update({
      quantity: newQuantity,
      ...restockFields,
    })
    .eq('inventory_id', Number(item.id))
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapInventoryRow(data as InventoryRow);
}

export async function getInventoryUpdateHistory(): Promise<InventoryUpdateHistory[]> {
  const { data, error } = await supabase
    .from('transaction_log')
    .select('transaction_log_id, table_name, row_id, operation, before_value, after_value, changed_at')
    .eq('table_name', 'inventory_items')
    .eq('operation', 'UPDATE')
    .order('changed_at', { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return ((data || []) as TransactionLogRow[])
    .map(mapInventoryHistoryRow)
    .filter((entry) => entry.quantityChange !== 0);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('inventory_id', Number(id));

  if (error) {
    throw error;
  }
}
