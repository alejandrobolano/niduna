import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  familyStoryReactionOptions,
  type FamilyStoryReaction,
  type FamilyStoryReactionSummary,
} from '@/features/family-stories/domain/family-story';
import { useReducedMotion } from '@/shared/presentation/use-reduced-motion';

const duplicatesPerReaction = 5;
const maximumParticles = 30;
const particlesPerWave = 15;
const horizontalPositions = [8, 72, 34, 86, 20, 57, 13, 65, 42, 91, 27, 51] as const;
const horizontalDrifts = [-18, 14, -10, 16, 9, -15, 12, -8, 17, -13, 8, -11] as const;
const verticalVariations = [0, 42, 18, 58, 30, 8, 50, 22, 46, 12, 54, 26] as const;

interface ReactionParticle {
  emoji: string;
  reaction: FamilyStoryReaction;
}

interface StoryReactionBurstProps {
  reactions: FamilyStoryReactionSummary[];
  storyId: string;
}

function createReactionParticles(
  reactions: FamilyStoryReactionSummary[],
): ReactionParticle[] {
  const remaining = new Map(
    reactions.map(({ count, reaction }) => [reaction, count * duplicatesPerReaction]),
  );
  const particles: ReactionParticle[] = [];

  while (particles.length < maximumParticles) {
    let addedParticle = false;

    for (const option of familyStoryReactionOptions) {
      const count = remaining.get(option.value) ?? 0;

      if (count > 0 && particles.length < maximumParticles) {
        particles.push({ emoji: option.emoji, reaction: option.value });
        remaining.set(option.value, count - 1);
        addedParticle = true;
      }
    }

    if (!addedParticle) {
      break;
    }
  }

  return particles;
}

function FloatingReaction({
  distance,
  delay,
  emoji,
  index,
}: {
  distance: number;
  delay: number;
  emoji: string;
  index: number;
}) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      delay,
      duration: 3_600 + (index % 3) * 120,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    });

    animation.start();
    return () => animation.stop();
  }, [delay, index, progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.78, 1],
    outputRange: [0, 1, 0.9, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.88, 1, 1.08],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, horizontalDrifts[index % horizontalDrifts.length]],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(distance + verticalVariations[index % verticalVariations.length])],
  });

  return (
    <Animated.View
      style={{
        bottom: 0,
        left: `${horizontalPositions[index % horizontalPositions.length]}%`,
        opacity,
        position: 'absolute',
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

export function StoryReactionBurst({
  reactions,
  storyId,
}: StoryReactionBurstProps) {
  const shouldReduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const particles = useMemo(() => createReactionParticles(reactions), [reactions]);
  const travelDistance = Math.max(280, height - insets.top - insets.bottom - 210);
  const signature = reactions
    .map(({ count, reaction }) => `${reaction}-${count}`)
    .join(':');

  if (shouldReduceMotion || particles.length === 0) {
    return null;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      key={`${storyId}:${signature}`}
      pointerEvents="none"
      style={styles.container}
    >
      {particles.map((particle, index) => (
        <FloatingReaction
          distance={travelDistance}
          delay={(index % particlesPerWave) * 55 + Math.floor(index / particlesPerWave) * 160}
          emoji={particle.emoji}
          index={index}
          key={`${storyId}-${signature}-${particle.reaction}-${index}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 106,
    left: 20,
    position: 'absolute',
    right: 20,
    top: 104,
  },
  emoji: { fontSize: 30 },
});
