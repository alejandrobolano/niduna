import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

import type { CareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';

export const NidunaCareWidget = createWidget<CareWidgetSnapshot>(
  'NidunaCareWidget',
  (snapshot, environment) => {
    'widget';

    const isDark = environment.colorScheme === 'dark';
    const accentColor = isDark ? '#8ED7D4' : '#248782';
    const backgroundColor = isDark ? '#151A33' : '#FFF8E8';
    const detailColor = isDark ? '#BFC5D6' : '#5D6780';
    const textColor = isDark ? '#FFF8E8' : '#16214A';

    return (
      <VStack
        alignment="leading"
        modifiers={[
          containerBackground(backgroundColor, 'widget'),
          padding({ all: 14 }),
          widgetURL('niduna:///?section=handoff'),
        ]}
        spacing={10}
      >
        <HStack alignment="center">
          <Text
            modifiers={[
              font({ design: 'rounded', size: 17, weight: 'bold' }),
              foregroundStyle(textColor),
            ]}
          >
            {snapshot.babyName}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ design: 'rounded', size: 10, weight: 'bold' }),
              foregroundStyle(accentColor),
            ]}
          >
            RELEVO
          </Text>
        </HStack>
        <HStack modifiers={[frame({ maxWidth: 1000 })]} spacing={16}>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(detailColor)]}>Alimentación</Text>
            <Text modifiers={[font({ design: 'rounded', size: 15, weight: 'bold' }), foregroundStyle(textColor)]}>{snapshot.feeding.value}</Text>
            <Text modifiers={[font({ size: 9 }), foregroundStyle(detailColor)]}>{snapshot.feeding.detail}</Text>
          </VStack>
          <Spacer />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(detailColor)]}>Pañal</Text>
            <Text modifiers={[font({ design: 'rounded', size: 15, weight: 'bold' }), foregroundStyle(textColor)]}>{snapshot.diaper.value}</Text>
            <Text modifiers={[font({ size: 9 }), foregroundStyle(detailColor)]}>{snapshot.diaper.detail}</Text>
          </VStack>
          <Spacer />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(detailColor)]}>Sueño</Text>
            <Text modifiers={[font({ design: 'rounded', size: 15, weight: 'bold' }), foregroundStyle(textColor)]}>{snapshot.sleep.value}</Text>
            <Text modifiers={[font({ size: 9 }), foregroundStyle(detailColor)]}>{snapshot.sleep.detail}</Text>
          </VStack>
        </HStack>
      </VStack>
    );
  },
);
