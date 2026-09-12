import type { CareWidgetAction } from '@/features/care-widget/domain/care-widget-action';

export const careHandoffDeepLink = 'niduna:///?section=handoff';

export function getCareActionDeepLink(action: CareWidgetAction): string {
  return `${careHandoffDeepLink}&careAction=${action}`;
}
