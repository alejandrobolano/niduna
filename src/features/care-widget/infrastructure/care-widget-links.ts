import type { CareWidgetAction } from '@/features/care-widget/domain/care-widget-action';

export const careHandoffDeepLink = 'niduna:///?section=handoff';

function appendBabyId(url: string, babyId?: string): string {
  return babyId ? `${url}&babyId=${encodeURIComponent(babyId)}` : url;
}

export function getCareHandoffDeepLink(babyId?: string): string {
  return appendBabyId(careHandoffDeepLink, babyId);
}

export function getCareActionDeepLink(
  action: CareWidgetAction,
  babyId?: string,
): string {
  return appendBabyId(`${careHandoffDeepLink}&careAction=${action}`, babyId);
}
