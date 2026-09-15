import type { CareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';

export async function updateCareWidget(_: CareWidgetSnapshot): Promise<void> {}

export async function clearCareWidgets(): Promise<void> {}

export async function clearCareWidgetsForBaby(_: string): Promise<void> {}

export async function reconcileCareWidgets(_: string[]): Promise<void> {}
