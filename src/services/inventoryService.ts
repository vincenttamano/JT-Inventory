import { supabase } from '../lib/supabaseClient';
import { InventoryItem } from '../types';

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

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('inventory_id', Number(id));

  if (error) {
    throw error;
  }
}
