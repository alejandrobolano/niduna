import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import {
  familyStoryReactionOptions,
  type FamilyStoryReaction,
  type FamilyStoryReactionSummary,
} from '@/features/family-stories/domain/family-story';
import { useReducedMotion } from '@/shared/presentation/use-reduced-motion';

const maximumParticles = 12;
const horizontalPositions = [12, 72, 38, 84, 24, 58, 6, 66, 44, 90, 18, 52] as const;
const horizontalDrifts = [-14, 10, -8, 12, 7, -12, 9, -6, 13, -10, 6, -9] as const;
const verticalDistances = [230, 290, 255, 320, 275, 240, 305, 265, 295, 245, 315, 280] as const;

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
    reactions.map(({ count, reaction }) => [reaction, count]),
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
  delay,
  emoji,
  index,
}: {
  delay: number;
  emoji: string;
  index: number;
}) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      delay,
      duration: 1_850 + (index % 3) * 140,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    });

    animation.start();
    return () => animation.stop();
  }, [delay, index, progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.72, 1],
    outputRange: [0, 0.92, 0.82, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.88, 1, 1.08],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, horizontalDrifts[index]],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -verticalDistances[index]],
  });

  return (
    <Animated.View
      style={{
        left: `${horizontalPositions[index]}%`,
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
  const particles = useMemo(() => createReactionParticles(reactions), [reactions]);
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
          delay={index * 55}
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
    bottom: 112,
    left: 20,
    position: 'absolute',
    right: 20,
    top: 92,
  },
  emoji: { fontSize: 28 },
});
