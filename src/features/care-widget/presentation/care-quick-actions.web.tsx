import type { CareWidgetAction } from '@/features/care-widget/domain/care-widget-action';

interface CareQuickActionsProps {
  enabled: boolean;
  onAction: (action: CareWidgetAction, babyId?: string) => void;
  onOpenHandoff: (babyId?: string) => void;
}

export function CareQuickActions(_: CareQuickActionsProps) {
  return null;
}
