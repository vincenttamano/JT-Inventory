import { SimpleUsageRecord } from '../types';
import {
  createPatientUsageRecord,
  deletePatientRecord,
  getPatientUsageHistory,
} from './patientService';

export async function getSimpleUsageHistory(): Promise<SimpleUsageRecord[]> {
  const records = await getPatientUsageHistory();
  return records.map((record) => ({
    id: record.id,
    date: record.date,
    procedure: record.procedure || 'Not specified',
    patientConsent: record.patientConsent ?? false,
    patientName: record.patientName || 'Anonymous Patient',
    items: record.items.map((item) => ({
      itemId: item.productId,
      itemName: item.productName,
      quantity: item.quantityUsed,
      unit: item.unit,
    })),
  }));
}

export async function createSimpleUsageRecord(input: SimpleUsageRecord, recordedByUserId?: string): Promise<SimpleUsageRecord> {
  const record = await createPatientUsageRecord({
    patientConsent: input.patientConsent,
    patientName: input.patientName,
    procedure: input.procedure,
    date: input.date,
    recordedByUserId,
    items: input.items.map((item) => ({
      productId: item.itemId,
      productName: item.itemName,
      quantityUsed: item.quantity,
      unit: item.unit,
    })),
  });

  return {
    id: record.id,
    date: record.date,
    procedure: record.procedure,
    patientConsent: record.patientConsent,
    patientName: record.patientName,
    items: record.items.map((item) => ({
      itemId: item.productId,
      itemName: item.productName,
      quantity: item.quantityUsed,
      unit: item.unit,
    })),
  };
}

export async function deleteSimpleUsageRecord(id: string): Promise<void> {
  await deletePatientRecord(id);
}
