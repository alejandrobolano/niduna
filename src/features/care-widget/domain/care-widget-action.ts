export type CareWidgetAction = 'diaper' | 'feeding' | 'sleep';

const careWidgetActions = new Set<CareWidgetAction>([
  'diaper',
  'feeding',
  'sleep',
]);

export function parseCareWidgetAction(
  value: unknown,
): CareWidgetAction | undefined {
  return typeof value === 'string' &&
    careWidgetActions.has(value as CareWidgetAction)
    ? (value as CareWidgetAction)
    : undefined;
}

export function createCareWidgetActionRequest(
  action: CareWidgetAction,
): { action: CareWidgetAction; id: number } {
  return { action, id: Date.now() };
}
