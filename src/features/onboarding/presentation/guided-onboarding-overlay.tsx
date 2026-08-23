import { ClipboardList, Moon, Users, X } from 'lucide-react-native';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { GuidedOnboardingStep } from '@/features/onboarding/domain/guided-onboarding';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface GuidedOnboardingOverlayProps {
  onComplete: () => void;
  onDismiss: () => void;
  onStepChange: (step: GuidedOnboardingStep) => void;
  steps: GuidedOnboardingStep[];
  visible: boolean;
}

const stepIcons = {
  family: Users,
  handoff: Moon,
  history: ClipboardList,
};

export function GuidedOnboardingOverlay({
  onComplete,
  onDismiss,
  onStepChange,
  steps,
  visible,
}: GuidedOnboardingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const titleRef = useRef<ComponentRef<typeof Text>>(null);
  const step = steps[stepIndex] ?? steps[0];

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeout = setTimeout(() => {
      if (Platform.OS === 'web') {
        (titleRef.current as unknown as { focus?: () => void })?.focus?.();
        return;
      }

      const node = findNodeHandle(titleRef.current);

      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [stepIndex, visible]);

  if (!step) {
    return null;
  }

  const Icon = stepIcons[step.section as keyof typeof stepIcons] ?? Moon;
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaView style={styles.root}>
        <View style={styles.backdrop} />
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.heading}>
            <View style={styles.icon}>
              <Icon color={colors.primaryPressed} size={23} />
            </View>
            <View style={styles.progress}>
              {steps.map((item, index) => (
                <View
                  accessibilityLabel={`Paso ${index + 1} de ${steps.length}`}
                  key={item.section}
                  style={[
                    styles.progressDot,
                    index === stepIndex && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            <Pressable
              accessibilityLabel="Saltar introducción"
              accessibilityRole="button"
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <X color={colors.text} size={21} />
            </Pressable>
          </View>

          <View style={styles.copy}>
            <Text style={styles.eyebrow}>{step.eyebrow}</Text>
            <Text
              accessible
              accessibilityRole="header"
              ref={titleRef}
              style={styles.title}
            >
              {step.title}
            </Text>
            <Text style={styles.description}>{step.description}</Text>
          </View>

          <View style={styles.contextNote}>
            <Text style={styles.contextNoteText}>
              Estás viendo esta zona de Niduna detrás de esta guía.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.skipButtonText}>Saltar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isLastStep) {
                  onComplete();
                  return;
                }

                const nextStep = steps[stepIndex + 1];

                if (nextStep) {
                  onStepChange(nextStep);
                  setStepIndex((current) => current + 1);
                }
              }}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep
                  ? steps.length === 1
                    ? 'Ir a Familia'
                    : 'Terminar'
                  : 'Siguiente'}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  root: {
    alignItems: 'center',
    backgroundColor: 'rgba(24, 35, 75, 0.48)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 14,
    gap: spacing.xl,
    maxWidth: 520,
    padding: spacing.xl,
    shadowColor: colors.text,
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    width: '100%',
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  progress: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  progressDot: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 7,
    width: 20,
  },
  progressDotActive: { backgroundColor: colors.coral, width: 34 },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: { gap: spacing.sm },
  eyebrow: {
    color: colors.primaryPressed,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  contextNote: {
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  contextNoteText: {
    color: colors.primaryPressed,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  skipButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  skipButtonText: { color: colors.textMuted, fontSize: 14, fontWeight: '900' },
  nextButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryPressed,
    borderRadius: radius.md,
    flex: 2,
    justifyContent: 'center',
    minHeight: 50,
  },
  nextButtonText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
}));
