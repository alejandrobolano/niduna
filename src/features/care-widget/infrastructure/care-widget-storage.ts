import { SQLiteStorage } from 'expo-sqlite/kv-store';

import {
  createEmptyCareWidgetSnapshot,
  parseCareWidgetSnapshot,
  type CareWidgetSnapshot,
} from '@/features/care-widget/domain/care-widget-snapshot';

const careWidgetStorage = new SQLiteStorage('niduna-care-widget.db');
const careWidgetStorageKey = 'active-care-snapshot';
const widgetBabyKeyPrefix = 'widget-baby';
const babySnapshotKeyPrefix = 'baby-snapshot';

function getWidgetBabyKey(widgetId: number): string {
  return `${widgetBabyKeyPrefix}.${widgetId}`;
}

function getBabySnapshotKey(babyId: string): string {
  return `${babySnapshotKeyPrefix}.${babyId}`;
}

export async function bindCareWidgetToBaby(
  widgetId: number,
  babyId: string,
): Promise<void> {
  await careWidgetStorage.setItemAsync(getWidgetBabyKey(widgetId), babyId);
}

export async function loadCareWidgetBabyId(
  widgetId: number,
): Promise<string | undefined> {
  return (
    (await careWidgetStorage.getItemAsync(getWidgetBabyKey(widgetId))) ??
    undefined
  );
}

export async function loadCareWidgetSnapshot(
  widgetId?: number,
): Promise<CareWidgetSnapshot> {
  const babyId =
    widgetId === undefined ? undefined : await loadCareWidgetBabyId(widgetId);
  const stored = await careWidgetStorage.getItemAsync(
    babyId ? getBabySnapshotKey(babyId) : careWidgetStorageKey,
  );
  return parseCareWidgetSnapshot(stored) ?? createEmptyCareWidgetSnapshot();
}

export async function saveCareWidgetSnapshot(
  snapshot: CareWidgetSnapshot,
): Promise<void> {
  await careWidgetStorage.setItemAsync(
    careWidgetStorageKey,
    JSON.stringify(snapshot),
  );

  if (snapshot.babyId) {
    await careWidgetStorage.setItemAsync(
      getBabySnapshotKey(snapshot.babyId),
      JSON.stringify(snapshot),
    );
  }
}

export async function removeCareWidgetBinding(widgetId: number): Promise<void> {
  await careWidgetStorage.removeItem(getWidgetBabyKey(widgetId));
}

export async function clearCareWidgetData(): Promise<void> {
  await careWidgetStorage.clearAsync();
}

export async function clearCareWidgetBabyData(babyId: string): Promise<void> {
  const keys = await careWidgetStorage.getAllKeysAsync();
  const bindingKeys = keys.filter((key) =>
    key.startsWith(`${widgetBabyKeyPrefix}.`),
  );
  const bindings = await careWidgetStorage.multiGet(bindingKeys);
  const activeSnapshot = parseCareWidgetSnapshot(
    await careWidgetStorage.getItemAsync(careWidgetStorageKey),
  );
  const keysToRemove = [
    getBabySnapshotKey(babyId),
    ...(activeSnapshot?.babyId === babyId ? [careWidgetStorageKey] : []),
    ...bindings.flatMap(([key, value]) => (value === babyId ? [key] : [])),
  ];

  await careWidgetStorage.multiRemove(keysToRemove);
}

export async function retainCareWidgetDataForBabies(
  babyIds: string[],
): Promise<void> {
  const allowedBabyIds = new Set(babyIds);
  const keys = await careWidgetStorage.getAllKeysAsync();
  const bindingKeys = keys.filter((key) =>
    key.startsWith(`${widgetBabyKeyPrefix}.`),
  );
  const bindings = await careWidgetStorage.multiGet(bindingKeys);
  const activeSnapshot = parseCareWidgetSnapshot(
    await careWidgetStorage.getItemAsync(careWidgetStorageKey),
  );
  const keysToRemove = [
    ...keys.filter(
      (key) =>
        key.startsWith(`${babySnapshotKeyPrefix}.`) &&
        !allowedBabyIds.has(key.slice(babySnapshotKeyPrefix.length + 1)),
    ),
    ...bindings.flatMap(([key, value]) =>
      value && !allowedBabyIds.has(value) ? [key] : [],
    ),
    ...(activeSnapshot?.babyId && !allowedBabyIds.has(activeSnapshot.babyId)
      ? [careWidgetStorageKey]
      : []),
  ];

  if (keysToRemove.length > 0) {
    await careWidgetStorage.multiRemove([...new Set(keysToRemove)]);
  }
}
