import { supabase } from '../lib/supabaseClient';
import { UsageRecord } from '../types';

interface PatientRow {
  patient_id: number;
  visit_date: string;
  procedure: string | null;
  patient_consent: boolean | null;
  patient_name: string | null;
  recorded_by_user_id: number | null;
}

interface UsageItemRow {
  usage_item_id: number;
  inventory_id: number;
  patient_visit_id: number | null;
  quantity_used: number;
  unit: string | null;
  product_name_snapshot: string | null;
  price_per_usage: number | null;
  used_at: string;
  recorded_by_user_id: number | null;
}

interface PatientRecordInput {
  patientConsent: boolean;
  patientName: string;
  procedure: string;
  date?: string;
  recordedByUserId?: string;
  items: {
    productId: string;
    productName: string;
    quantityUsed: number;
    unit: string;
  }[];
}

function mapRecord(patient: PatientRow, items: UsageItemRow[]): UsageRecord {
  return {
    id: patient.patient_id.toString(),
    patientConsent: patient.patient_consent ?? false,
    patientName: patient.patient_name || 'Anonymous Patient',
    patientId: patient.patient_id.toString(),
    procedure: patient.procedure || 'Not specified',
    date: patient.visit_date,
    items: items.map((item) => ({
      productId: item.inventory_id.toString(),
      productName: item.product_name_snapshot || '',
      quantityUsed: item.quantity_used,
      unit: item.unit || '',
    })),
    recordedBy: patient.recorded_by_user_id?.toString() || 'Unknown',
  };
}

export async function getPatientUsageHistory(): Promise<UsageRecord[]> {
  const { data: patients, error: patientError } = await supabase
    .from('patient')
    .select('*')
    .order('visit_date', { ascending: false });

  if (patientError) {
    throw patientError;
  }

  const patientRows = (patients || []) as PatientRow[];
  if (patientRows.length === 0) {
    return [];
  }

  const patientIds = patientRows.map((patient) => patient.patient_id);
  const { data: usageItems, error: usageError } = await supabase
    .from('usage_items')
    .select('*')
    .in('patient_visit_id', patientIds);

  if (usageError) {
    throw usageError;
  }

  const usageRows = (usageItems || []) as UsageItemRow[];
  return patientRows.map((patient) =>
    mapRecord(
      patient,
      usageRows.filter((item) => item.patient_visit_id === patient.patient_id)
    )
  );
}

export async function createPatientUsageRecord(input: PatientRecordInput): Promise<UsageRecord> {
  const { data: patient, error: patientError } = await supabase
    .from('patient')
    .insert({
      visit_date: input.date || new Date().toISOString().split('T')[0],
      procedure: input.procedure,
      patient_consent: input.patientConsent,
      patient_name: input.patientName,
      recorded_by_user_id: input.recordedByUserId ? Number(input.recordedByUserId) : null,
    })
    .select()
    .single();

  if (patientError) {
    throw patientError;
  }

  const patientRow = patient as PatientRow;
  const usageRowsToInsert = input.items.map((item) => ({
    inventory_id: Number(item.productId),
    patient_visit_id: patientRow.patient_id,
    quantity_used: item.quantityUsed,
    unit: item.unit,
    product_name_snapshot: item.productName,
    used_at: new Date().toISOString(),
    recorded_by_user_id: input.recordedByUserId ? Number(input.recordedByUserId) : null,
  }));

  const { data: usageItems, error: usageError } = await supabase
    .from('usage_items')
    .insert(usageRowsToInsert)
    .select();

  if (usageError) {
    throw usageError;
  }

  return mapRecord(patientRow, (usageItems || []) as UsageItemRow[]);
}

export async function updatePatientRecord(id: string, changes: {
  patientName: string;
  procedure: string;
}): Promise<void> {
  const { error } = await supabase
    .from('patient')
    .update({
      patient_name: changes.patientName,
      procedure: changes.procedure,
    })
    .eq('patient_id', Number(id));

  if (error) {
    throw error;
  }
}

export async function deletePatientRecord(id: string): Promise<void> {
  const patientId = Number(id);

  const { error: usageError } = await supabase
    .from('usage_items')
    .delete()
    .eq('patient_visit_id', patientId);

  if (usageError) {
    throw usageError;
  }

  const { error: patientError } = await supabase
    .from('patient')
    .delete()
    .eq('patient_id', patientId);

  if (patientError) {
    throw patientError;
  }
}
