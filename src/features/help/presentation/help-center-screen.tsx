import {
  ArrowLeft,
  Baby,
  Bell,
  BookOpenCheck,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  HeartHandshake,
  Images,
  ShieldCheck,
  UserRoundCog,
  Users,
} from 'lucide-react-native';
import { type ComponentType, useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  type ViewStyle,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  helpGuides,
  helpQuestions,
  type HelpGuide,
} from '@/features/help/application/help-content';
import {
  colors,
  createThemedStyleSheet,
  radius,
  spacing,
} from '@/shared/presentation/theme';

interface HelpCenterScreenProps {
  onBack: () => void;
  onReplayOnboarding: () => void;
}

const guideIcons: Record<string, ComponentType<{ color: string; size: number }>> = {
  account: UserRoundCog,
  baby: Baby,
  context: HeartHandshake,
  family: Users,
  handoff: BookOpenCheck,
  notifications: Bell,
  records: ClipboardList,
  stories: Images,
  summary: ChartNoAxesCombined,
};

function GuideItem({ guide }: { guide: HelpGuide }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = guideIcons[guide.id] ?? CircleHelp;

  return (
    <View style={styles.guideItem}>
      <Pressable
        accessibilityHint={expanded ? 'Oculta los pasos' : 'Muestra los pasos'}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.guideButton, pressed && styles.pressed]}
      >
        <View style={styles.guideIcon}>
          <Icon color={colors.primaryPressed} size={21} />
        </View>
        <View style={styles.guideCopy}>
          <Text style={styles.guideTitle}>{guide.title}</Text>
          <Text style={styles.guideDescription}>{guide.description}</Text>
        </View>
        <ChevronDown
          color={colors.textMuted}
          size={20}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.steps}>
          {guide.steps.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function HelpCenterScreen({
  onBack,
  onReplayOnboarding,
}: HelpCenterScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 620;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });

    return () => subscription.remove();
  }, [onBack]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Pressable
              accessibilityLabel="Volver"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <ArrowLeft color={colors.text} size={22} />
            </Pressable>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                Cómo usar Niduna
              </Text>
              <Text style={styles.subtitle}>
                Guías cortas para coordinar el cuidado sin perderte por la app.
              </Text>
            </View>
          </View>

          <View style={[styles.intro, compact && styles.stackPanel]}>
            <View style={styles.introIcon}>
              <HeartHandshake color={colors.primaryPressed} size={25} />
            </View>
            <View style={styles.introCopy}>
              <Text style={styles.introTitle}>Empieza por lo que necesitas hacer</Text>
              <Text style={styles.introText}>
                Abre una guía para ver los pasos. La familia y el bebé activos de la cabecera determinan dónde se guardan los cuidados.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guías paso a paso</Text>
            <View style={styles.guideList}>
              {helpGuides.map((guide) => (
                <GuideItem guide={guide} key={guide.id} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
            <View style={styles.questions}>
              {helpQuestions.map((item) => (
                <View key={item.id} style={styles.question}>
                  <Text style={styles.questionTitle}>{item.question}</Text>
                  <Text style={styles.questionAnswer}>{item.answer}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.replayPanel, compact && styles.stackPanel]}>
            <View style={styles.replayCopy}>
              <Text style={styles.replayTitle}>¿Prefieres verlo dentro de la app?</Text>
              <Text style={styles.replayText}>
                Repite el recorrido guiado por Relevo, Registro, Familia y avisos.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onReplayOnboarding}
              style={({ pressed }) => [
                styles.replayButton,
                compact && styles.compactReplayButton,
                pressed && styles.pressed,
              ]}
            >
              <BookOpenCheck color={colors.onAccent} size={18} />
              <Text style={styles.replayButtonText}>Repetir introducción</Text>
            </Pressable>
          </View>

          <View style={styles.medicalNote}>
            <ShieldCheck color={colors.primaryPressed} size={20} />
            <Text style={styles.medicalNoteText}>
              Niduna ayuda a organizar el relevo familiar. Ante cualquier duda sobre la salud o el crecimiento del bebé, consulta con su profesional sanitario.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardBase: ViewStyle = {
  borderWidth: 1,
  width: '100%',
};

const styles = createThemedStyleSheet((colors) => ({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: {
    alignItems: 'center',
    paddingBottom: 64,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  content: { gap: spacing.xl, maxWidth: 920, width: '100%' },
  heading: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headingCopy: { flex: 1, gap: spacing.xs },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  intro: {
    ...cardBase,
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  introIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  introCopy: { flex: 1, gap: spacing.xs },
  introTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  introText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  section: {
    ...cardBase,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  guideList: { gap: spacing.sm },
  guideItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  guideButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    paddingVertical: spacing.sm,
  },
  guideIcon: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  guideCopy: { flex: 1, gap: 2 },
  guideTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  guideDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  steps: { gap: spacing.md, paddingBottom: spacing.md, paddingLeft: 56 },
  step: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  stepNumberText: { color: colors.onAccent, fontSize: 11, fontWeight: '900' },
  stepText: { color: colors.textMuted, flex: 1, fontSize: 13, lineHeight: 19 },
  questions: { gap: spacing.lg },
  question: { gap: spacing.xs },
  questionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  questionAnswer: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  replayPanel: {
    ...cardBase,
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderColor: colors.lavender,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  replayCopy: { flex: 1, gap: spacing.xs },
  replayTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  replayText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  replayButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryPressed,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  replayButtonText: { color: colors.onAccent, fontSize: 13, fontWeight: '900' },
  compactReplayButton: { width: '100%' },
  stackPanel: { alignItems: 'stretch', flexDirection: 'column' },
  medicalNote: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  medicalNoteText: { color: colors.textMuted, flex: 1, fontSize: 11, lineHeight: 17 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
}));
