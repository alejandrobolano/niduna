import * as Linking from 'expo-linking';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { setItems } from 'expo-quick-actions';
import { useCallback, useEffect, useRef } from 'react';

import {
  parseCareWidgetAction,
  type CareWidgetAction,
} from '@/features/care-widget/domain/care-widget-action';

interface CareQuickActionsProps {
  enabled: boolean;
  onAction: (action: CareWidgetAction) => void;
  onOpenHandoff: () => void;
}

const quickActions = [
  {
    icon: 'compose',
    id: 'feeding',
    params: { careAction: 'feeding' },
    subtitle: 'Abrir Relevo',
    title: 'Registrar alimentación',
  },
  {
    icon: 'task',
    id: 'diaper',
    params: { careAction: 'diaper' },
    subtitle: 'Abrir Relevo',
    title: 'Registrar pañal',
  },
  {
    icon: 'time',
    id: 'sleep',
    params: { careAction: 'sleep' },
    subtitle: 'Abrir Relevo',
    title: 'Registrar sueño',
  },
] as const;

export function CareQuickActions({
  enabled,
  onAction,
  onOpenHandoff,
}: CareQuickActionsProps) {
  const lastHandledAction = useRef<object | undefined>(undefined);
  const handleQuickAction = useCallback(
    (quickAction: {
      id: string;
      params?: Record<string, boolean | null | number | string | undefined> | null;
    }) => {
      if (lastHandledAction.current === quickAction) {
        return;
      }

      lastHandledAction.current = quickAction;
      const action = parseCareWidgetAction(
        quickAction.params?.careAction ?? quickAction.id,
      );

      if (action) {
        onAction(action);
      }
    },
    [onAction],
  );

  useQuickActionCallback(handleQuickAction);

  useEffect(() => {
    void setItems(enabled ? [...quickActions] : []);
  }, [enabled]);

  useEffect(
    () => () => {
      void setItems([]);
    },
    [],
  );

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      const action = parseCareWidgetAction(parsed.queryParams?.careAction);

      if (action) {
        onAction(action);
      } else if (parsed.queryParams?.section === 'handoff') {
        onOpenHandoff();
      }
    });

    return () => subscription.remove();
  }, [onAction, onOpenHandoff]);

  return null;
}
