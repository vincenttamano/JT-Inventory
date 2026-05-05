import { STORAGE_KEYS } from '../utils/storageKeys';

export const DEFAULT_CATEGORIES = [
  'Anesthetics',
  'PPE',
  'Restorative',
  'Disinfectants',
  'Instruments',
  'Consumables',
  'Preventive',
  'Other',
];

export function getCategories(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.customCategories);
    if (stored) {
      const custom: string[] = JSON.parse(stored);
      return Array.from(new Set([...DEFAULT_CATEGORIES, ...custom]));
    }
  } catch {}

  return DEFAULT_CATEGORIES;
}

export function saveCustomCategory(name: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.customCategories);
    const existing: string[] = stored ? JSON.parse(stored) : [];
    if (!existing.includes(name)) {
      localStorage.setItem(STORAGE_KEYS.customCategories, JSON.stringify([...existing, name]));
    }
  } catch {}
}
