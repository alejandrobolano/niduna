import { Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View
} from 'react-native';

import { colors } from '@/shared/presentation/theme';

interface NuniMascotProps {
  size?: number;
}

const ARTBOARD_WIDTH = 220;
const ARTBOARD_HEIGHT = 154;

export function NuniMascot({ size = ARTBOARD_WIDTH }: NuniMascotProps) {
  const [floating] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotionEnabled) => {
      if (reduceMotionEnabled) {
        return;
      }

      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(floating, {
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            toValue: 1,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(floating, {
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            toValue: 0,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
      );
      animation.start();
    });

    return () => animation?.stop();
  }, [floating]);

  const scale = size / ARTBOARD_WIDTH;
  const translateY = floating.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: ARTBOARD_HEIGHT * scale, width: size }}
    >
      <View style={[styles.artboard, { transform: [{ scale }] }]}>
        <View style={[styles.star, styles.starLeft]}>
          <Sparkles color={colors.butter} size={20} />
        </View>
        <View style={[styles.star, styles.starRight]}>
          <Sparkles color={colors.butter} size={20} />
        </View>
        <View style={[styles.cloud, styles.cloudLeft]}>
          <View style={[styles.cloudBubble, styles.cloudBubbleSmall]} />
          <View style={styles.cloudBubble} />
        </View>
        <View style={[styles.cloud, styles.cloudRight]}>
          <View style={[styles.cloudBubble, styles.cloudBubbleSmall]} />
          <View style={styles.cloudBubble} />
        </View>
        <Animated.View style={[styles.character, { transform: [{ translateY }] }]}>
          <View style={styles.nest}>
            <View style={styles.nestCutout} />
          </View>
          <View style={styles.leftWing} />
          <View style={styles.rightWing} />
          <View style={styles.body}>
            <View style={styles.tuftLeft} />
            <View style={styles.tuftRight} />
            <View style={styles.leftEye}>
              <View style={styles.eyeShine} />
            </View>
            <View style={styles.rightEye}>
              <View style={styles.eyeShine} />
            </View>
            <View style={styles.leftCheek} />
            <View style={styles.rightCheek} />
            <View style={styles.beak} />
            <View style={styles.belly} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artboard: {
    height: ARTBOARD_HEIGHT,
    transformOrigin: 'top left',
    width: ARTBOARD_WIDTH,
  },
  star: { position: 'absolute' },
  starLeft: { left: 19, top: 22 },
  starRight: { right: 16, top: 5 },
  cloud: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 28,
    position: 'absolute',
  },
  cloudLeft: { left: 0, top: 75 },
  cloudRight: { right: 0, top: 60 },
  cloudBubble: {
    backgroundColor: colors.white,
    borderRadius: 20,
    height: 28,
    marginLeft: -6,
    width: 42,
  },
  cloudBubbleSmall: { height: 20, width: 28 },
  character: {
    bottom: 0,
    height: 144,
    left: 34,
    position: 'absolute',
    width: 152,
  },
  nest: {
    backgroundColor: colors.butterSoft,
    borderRadius: 75,
    bottom: 0,
    height: 72,
    left: 1,
    overflow: 'hidden',
    position: 'absolute',
    width: 150,
  },
  nestCutout: {
    backgroundColor: colors.sky,
    borderRadius: 64,
    height: 72,
    left: 36,
    position: 'absolute',
    top: -29,
    width: 112,
  },
  body: {
    backgroundColor: colors.aqua,
    borderRadius: 58,
    height: 112,
    left: 32,
    position: 'absolute',
    top: 20,
    width: 91,
  },
  leftWing: {
    backgroundColor: colors.butter,
    borderRadius: 30,
    height: 56,
    left: 15,
    position: 'absolute',
    top: 63,
    transform: [{ rotate: '24deg' }],
    width: 38,
  },
  rightWing: {
    backgroundColor: colors.butter,
    borderRadius: 30,
    height: 56,
    position: 'absolute',
    right: 13,
    top: 63,
    transform: [{ rotate: '-24deg' }],
    width: 38,
  },
  tuftLeft: {
    backgroundColor: colors.coral,
    borderRadius: 12,
    height: 30,
    left: 36,
    position: 'absolute',
    top: -19,
    transform: [{ rotate: '-24deg' }],
    width: 16,
  },
  tuftRight: {
    backgroundColor: colors.coral,
    borderRadius: 12,
    height: 27,
    left: 51,
    position: 'absolute',
    top: -17,
    transform: [{ rotate: '28deg' }],
    width: 15,
  },
  leftEye: {
    backgroundColor: colors.text,
    borderRadius: 10,
    height: 17,
    left: 22,
    position: 'absolute',
    top: 35,
    width: 14,
  },
  rightEye: {
    backgroundColor: colors.text,
    borderRadius: 10,
    height: 17,
    position: 'absolute',
    right: 22,
    top: 35,
    width: 14,
  },
  eyeShine: {
    backgroundColor: colors.white,
    borderRadius: 3,
    height: 5,
    left: 3,
    position: 'absolute',
    top: 2,
    width: 5,
  },
  leftCheek: {
    backgroundColor: colors.coral,
    borderRadius: 7,
    height: 9,
    left: 11,
    opacity: 0.72,
    position: 'absolute',
    top: 57,
    width: 15,
  },
  rightCheek: {
    backgroundColor: colors.coral,
    borderRadius: 7,
    height: 9,
    opacity: 0.72,
    position: 'absolute',
    right: 11,
    top: 57,
    width: 15,
  },
  beak: {
    backgroundColor: colors.coral,
    borderRadius: 8,
    height: 10,
    left: 38,
    position: 'absolute',
    top: 55,
    transform: [{ rotate: '45deg' }],
    width: 15,
  },
  belly: {
    backgroundColor: colors.aquaSoft,
    borderRadius: 30,
    bottom: 5,
    height: 48,
    left: 24,
    opacity: 0.74,
    position: 'absolute',
    width: 44,
  },
});
