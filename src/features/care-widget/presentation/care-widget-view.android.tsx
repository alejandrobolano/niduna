'use no memo';

import {
  FlexWidget,
  SvgWidget,
  TextWidget,
  type WidgetRepresentation,
} from 'react-native-android-widget';

import { formatCareEventRecency } from '@/features/care/domain/care-time';
import type { CareWidgetAction } from '@/features/care-widget/domain/care-widget-action';
import type { CareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';
import {
  careHandoffDeepLink,
  getCareActionDeepLink,
} from '@/features/care-widget/infrastructure/care-widget-links';

const nuniMascot = require('../../../../assets/images/nuni-transparent.svg');

interface CareWidgetViewProps {
  dark: boolean;
  snapshot: CareWidgetSnapshot;
}

export function CareWidgetView({ dark, snapshot }: CareWidgetViewProps) {
  const palette = dark
    ? {
        accent: '#8ED7D4' as const,
        background: '#151A33' as const,
        card: '#1D2340' as const,
        detail: '#BFC5D6' as const,
        diaper: '#F3D36E' as const,
        feeding: '#F19189' as const,
        sleep: '#B99AE3' as const,
        text: '#FFF8E8' as const,
      }
    : {
        accent: '#248782' as const,
        background: '#FFF8E8' as const,
        card: '#FFFFFF' as const,
        detail: '#5D6780' as const,
        diaper: '#C79C16' as const,
        feeding: '#C6544D' as const,
        sleep: '#7653A4' as const,
        text: '#16214A' as const,
      };
  const now = new Date();

  return (
    <FlexWidget
      accessibilityLabel={`Relevo de ${snapshot.babyName}. Toca para abrir Niduna.`}
      clickAction="OPEN_URI"
      clickActionData={{ uri: careHandoffDeepLink }}
      style={{
        backgroundGradient: {
          from: palette.background,
          orientation: 'TOP_BOTTOM',
          to: palette.background,
        },
        borderRadius: 24,
        flexDirection: 'column',
        height: 'match_parent',
        overflow: 'hidden',
        justifyContent: 'center',
        padding: 14,
        width: 'match_parent',
      }}
    >
      <FlexWidget
        style={{ alignItems: 'center', flexDirection: 'row', flexGap: 9 }}
      >
        <SvgWidget style={{ height: 34, width: 34 }} svg={nuniMascot} />
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget
            maxLines={1}
            style={{ color: palette.text, fontSize: 17, fontWeight: 'bold' }}
            text={snapshot.babyName}
            truncate="END"
          />
          <TextWidget
            style={{ color: palette.accent, fontSize: 10, fontWeight: 'bold' }}
            text="RELEVO DE NIDUNA"
          />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget
        style={{
          flexDirection: 'row',
          flexGap: 8,
          marginTop: 10,
        }}
      >
        <CareWidgetCard
          accent={palette.feeding}
          action="feeding"
          item={snapshot.feeding}
          now={now}
          palette={palette}
        />
        <CareWidgetCard
          accent={palette.diaper}
          action="diaper"
          item={snapshot.diaper}
          now={now}
          palette={palette}
        />
        <CareWidgetCard
          accent={palette.sleep}
          action="sleep"
          item={snapshot.sleep}
          now={now}
          palette={palette}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function createCareWidgetRepresentation(
  snapshot: CareWidgetSnapshot,
): WidgetRepresentation {
  return {
    dark: <CareWidgetView dark snapshot={snapshot} />,
    light: <CareWidgetView dark={false} snapshot={snapshot} />,
  };
}

function CareWidgetCard({
  accent,
  action,
  item,
  now,
  palette,
}: {
  accent: `#${string}`;
  action: CareWidgetAction;
  item: CareWidgetSnapshot['feeding'];
  now: Date;
  palette: {
    card: `#${string}`;
    detail: `#${string}`;
    text: `#${string}`;
  };
}) {
  const value = item.relativeTo
    ? formatCareEventRecency(item.relativeTo, now)
    : item.value;
  const detail = item.detailRelativeTo
    ? `Desde ${formatCareEventRecency(item.detailRelativeTo, now).toLowerCase()}`
    : item.detail;

  return (
    <FlexWidget
      accessibilityLabel={`${item.title}: ${value}. Toca para registrar.`}
      clickAction="OPEN_URI"
      clickActionData={{ uri: getCareActionDeepLink(action) }}
      style={{
        alignItems: 'center',
        backgroundColor: palette.card,
        borderRadius: 14,
        borderTopColor: accent,
        borderTopWidth: 3,
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 8,
      }}
    >
      <TextWidget
        maxLines={1}
        style={{ color: palette.detail, fontSize: 10, textAlign: 'center' }}
        text={`+ ${item.title}`}
        truncate="END"
      />
      <TextWidget
        maxLines={1}
        style={{
          color: palette.text,
          fontSize: 13,
          fontWeight: 'bold',
          marginTop: 3,
          textAlign: 'center',
        }}
        text={value}
        truncate="END"
      />
      <TextWidget
        maxLines={1}
        style={{
          color: palette.detail,
          fontSize: 9,
          marginTop: 3,
          textAlign: 'center',
        }}
        text={detail}
        truncate="END"
      />
    </FlexWidget>
  );
}
