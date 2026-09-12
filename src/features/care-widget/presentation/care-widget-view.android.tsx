import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { CareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';
import { careHandoffDeepLink } from '@/features/care-widget/infrastructure/care-widget-links';

interface CareWidgetViewProps {
  dark: boolean;
  snapshot: CareWidgetSnapshot;
}

export function CareWidgetView({ dark, snapshot }: CareWidgetViewProps) {
  const palette = dark
    ? {
        accent: '#8ED7D4' as const,
        background: '#151A33' as const,
        detail: '#BFC5D6' as const,
        divider: '#323A59' as const,
        text: '#FFF8E8' as const,
      }
    : {
        accent: '#248782' as const,
        background: '#FFF8E8' as const,
        detail: '#5D6780' as const,
        divider: '#E8DDC9' as const,
        text: '#16214A' as const,
      };

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
        padding: 16,
        width: 'match_parent',
      }}
    >
      <FlexWidget
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <TextWidget
          maxLines={1}
          style={{ color: palette.text, fontSize: 17, fontWeight: 'bold' }}
          text={snapshot.babyName}
          truncate="END"
        />
        <TextWidget
          style={{ color: palette.accent, fontSize: 11, fontWeight: 'bold' }}
          text="RELEVO"
        />
      </FlexWidget>
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 12,
        }}
      >
        <CareWidgetColumn item={snapshot.feeding} palette={palette} />
        <FlexWidget style={{ backgroundColor: palette.divider, width: 1 }} />
        <CareWidgetColumn item={snapshot.diaper} palette={palette} />
        <FlexWidget style={{ backgroundColor: palette.divider, width: 1 }} />
        <CareWidgetColumn item={snapshot.sleep} palette={palette} />
      </FlexWidget>
    </FlexWidget>
  );
}

function CareWidgetColumn({
  item,
  palette,
}: {
  item: CareWidgetSnapshot['feeding'];
  palette: {
    detail: `#${string}`;
    text: `#${string}`;
  };
}) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: 9,
      }}
    >
      <TextWidget
        maxLines={1}
        style={{ color: palette.detail, fontSize: 11 }}
        text={item.title}
        truncate="END"
      />
      <TextWidget
        maxLines={1}
        style={{ color: palette.text, fontSize: 16, fontWeight: 'bold', marginTop: 2 }}
        text={item.value}
        truncate="END"
      />
      <TextWidget
        maxLines={1}
        style={{ color: palette.detail, fontSize: 10, marginTop: 2 }}
        text={item.detail}
        truncate="END"
      />
    </FlexWidget>
  );
}
