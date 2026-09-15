import {
  parseCareWidgetAction,
  type CareWidgetAction,
} from './care-widget-action';
import type { FamilyBabyGroup } from '../../family/domain/family-baby-context';

export interface CareWidgetIntent {
  action?: CareWidgetAction;
  babyId?: string;
  openHandoff: boolean;
}

interface CareWidgetTargetInput {
  activeBabyId?: string;
  activeFamilyId?: string;
  babyId?: string;
  families: FamilyBabyGroup[];
  requireRecordingPermission: boolean;
}

export function parseCareWidgetIntent(url: string): CareWidgetIntent | undefined {
  try {
    const parsed = new URL(url);
    const action = parseCareWidgetAction(parsed.searchParams.get('careAction'));
    const babyId = parsed.searchParams.get('babyId')?.trim() || undefined;
    const openHandoff = parsed.searchParams.get('section') === 'handoff';

    return action || openHandoff ? { action, babyId, openHandoff } : undefined;
  } catch {
    return undefined;
  }
}

export function resolveCareWidgetTarget({
  activeBabyId,
  activeFamilyId,
  babyId,
  families,
  requireRecordingPermission,
}: CareWidgetTargetInput): string | undefined {
  const targetBabyId = babyId ?? activeBabyId;
  const family = babyId
    ? families.find((candidate) =>
        candidate.babies.some((baby) => baby.id === babyId),
      )
    : families.find((candidate) => candidate.id === activeFamilyId);
  const baby = family?.babies.find((candidate) => candidate.id === targetBabyId);
  const canRecord =
    family?.role === 'owner' ||
    family?.role === 'admin' ||
    family?.role === 'caregiver';

  if (
    !baby ||
    baby.lifeStage !== 'born' ||
    (requireRecordingPermission && !canRecord)
  ) {
    return undefined;
  }

  return baby.id;
}
