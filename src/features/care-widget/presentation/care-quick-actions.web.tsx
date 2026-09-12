import type { CareWidgetAction } from '@/features/care-widget/domain/care-widget-action';

interface CareQuickActionsProps {
  enabled: boolean;
  onAction: (action: CareWidgetAction) => void;
  onOpenHandoff: () => void;
}

export function CareQuickActions(_: CareQuickActionsProps) {
  return null;
}
