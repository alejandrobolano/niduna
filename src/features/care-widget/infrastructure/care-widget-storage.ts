import { SQLiteStorage } from 'expo-sqlite/kv-store';

import {
  createEmptyCareWidgetSnapshot,
  parseCareWidgetSnapshot,
  type CareWidgetSnapshot,
} from '@/features/care-widget/domain/care-widget-snapshot';

const careWidgetStorage = new SQLiteStorage('niduna-care-widget.db');
const careWidgetStorageKey = 'active-care-snapshot';

export async function loadCareWidgetSnapshot(): Promise<CareWidgetSnapshot> {
  const stored = await careWidgetStorage.getItemAsync(careWidgetStorageKey);
  return parseCareWidgetSnapshot(stored) ?? createEmptyCareWidgetSnapshot();
}

export async function saveCareWidgetSnapshot(
  snapshot: CareWidgetSnapshot,
): Promise<void> {
  await careWidgetStorage.setItemAsync(
    careWidgetStorageKey,
    JSON.stringify(snapshot),
  );
}
