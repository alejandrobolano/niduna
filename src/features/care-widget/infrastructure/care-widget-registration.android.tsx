import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { supabaseAuthService } from '@/features/auth/infrastructure/supabase-auth-service';
import { supabaseCareRepository } from '@/features/care/infrastructure/supabase-care-repository';
import {
  createCareWidgetSnapshot,
  createEmptyCareWidgetSnapshot,
  type CareWidgetSnapshot,
} from '@/features/care-widget/domain/care-widget-snapshot';
import {
  bindCareWidgetToBaby,
  loadCareWidgetBabyId,
  loadCareWidgetSnapshot,
  removeCareWidgetBinding,
  saveCareWidgetSnapshot,
} from '@/features/care-widget/infrastructure/care-widget-storage';
import { createCareWidgetRepresentation } from '@/features/care-widget/presentation/care-widget-view.android';

export async function careWidgetTaskHandler({
  renderWidget,
  widgetAction,
  widgetInfo,
}: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction === 'WIDGET_DELETED') {
    await removeCareWidgetBinding(widgetInfo.widgetId);
    return;
  }

  const snapshot = await loadFreshWidgetSnapshot(widgetInfo.widgetId);
  renderWidget(createCareWidgetRepresentation(snapshot));
}

async function loadFreshWidgetSnapshot(
  widgetId: number,
): Promise<CareWidgetSnapshot> {
  const cachedSnapshot = await loadCareWidgetSnapshot(widgetId).catch(() =>
    createEmptyCareWidgetSnapshot(),
  );
  const babyId =
    (await loadCareWidgetBabyId(widgetId).catch(() => undefined)) ??
    cachedSnapshot.babyId;

  if (!babyId) {
    return cachedSnapshot;
  }

  await bindCareWidgetToBaby(widgetId, babyId);

  try {
    const session = await supabaseAuthService.getSession();
    if (!session) {
      return cachedSnapshot;
    }

    const dashboard = await supabaseCareRepository.load(session.user.id, babyId);
    if (!dashboard) {
      return cachedSnapshot;
    }

    const freshSnapshot = createCareWidgetSnapshot(dashboard);
    await saveCareWidgetSnapshot(freshSnapshot);
    return freshSnapshot;
  } catch {
    return cachedSnapshot;
  }
}
