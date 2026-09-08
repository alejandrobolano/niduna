import {
  BabyIcon,
  Check,
  CloudSun,
  Milk,
  Moon,
  NotebookPen,
  Plus,
  RefreshCw,
  Scale,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveStableMemberAvatar } from '@/features/avatars/domain/avatar';
import { AnimalAvatar } from '@/features/avatars/presentation/animal-avatar';
import { getBabyWeightProgress } from '@/features/care/application/baby-weight-progress';
import { subscribeToCareDataChanges } from '@/features/care/application/care-data-events';
import type { CareRepository } from '@/features/care/application/care-repository';
import {
  getCareSnapshot,
  getDurationMinutes,
} from '@/features/care/application/care-snapshot';
import type {
  CareDashboard,
  CareEvent,
  DiaperEvent,
  FeedingEvent,
  MeasurementEvent,
} from '@/features/care/domain/care-event';
import {
  CareActionSheet,
  type CareAction,
} from '@/features/care/presentation/care-action-sheet';
import { shouldShowQuickActionAccess } from '@/features/care/presentation/quick-action-visibility';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { ScreenHero } from '@/shared/presentation/screen-hero';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const feedingLabels: Record<FeedingEvent['method'], string> = {
  breast: 'Pecho',
  expressed_milk: 'Leche extraída',
  formula: 'Fórmula',
  mixed: 'Mixta',
};

const breastSideLabels: Record<
  NonNullable<FeedingEvent['breastSide']>,
  string
> = {
  both: 'ambos lados',
  left: 'lado izquierdo',
  right: 'lado derecho',
};

const diaperLabels: Record<DiaperEvent['condition'], string> = {
  both: 'Pipí y caca',
  dirty: 'Caca',
  wet: 'Pipí',
};

const measurementSourceLabels: Record<string, string> = {
  birth: 'Nacimiento',
  home: 'Casa',
  hospital: 'Hospital',
  other: 'Otro',
  pediatrician: 'Pediatría',
};

interface CareHandoffScreenProps {
  babyId?: string;
  canCreateBaby: boolean;
  onOpenBabyProfile: () => void;
  repository: CareRepository;
  storiesContent?: ReactNode;
  topContent?: ReactNode;
  userId: string;
}

interface SummaryCardProps {
  accent: string;
  detail: string;
  icon: LucideIcon;
  title: string;
  value: string;
}

function SummaryCard({
  accent,
  detail,
  icon: Icon,
  title,
  value,
}: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: accent }]}>
      <View style={styles.summaryHeading}>
        <View
          style={[styles.summaryIconBadge, { backgroundColor: `${accent}22` }]}
        >
          <Icon color={accent} size={16} />
        </View>
        <Text style={styles.summaryTitle}>{title}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryDetail}>{detail}</Text>
    </View>
  );
}

function formatWhen(value: string, now: Date): string {
  const differenceMinutes = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(value)) / 60_000),
  );

  if (differenceMinutes < 1) {
    return 'Ahora';
  }

  if (differenceMinutes < 60) {
    return `Hace ${differenceMinutes} min`;
  }

  if (differenceMinutes < 24 * 60) {
    const hours = Math.floor(differenceMinutes / 60);
    const minutes = differenceMinutes % 60;
    return minutes > 0 ? `Hace ${hours} h ${minutes} min` : `Hace ${hours} h`;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function formatBabyAgeLabel(birthDate: string | undefined, now: Date): string | undefined {
  if (!birthDate) {
    return undefined;
  }

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return undefined;
  }

  const diffMs = now.getTime() - birth.getTime();
  if (diffMs <= 0) {
    return undefined;
  }

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays < 14) {
    return `${totalDays} ${totalDays === 1 ? 'día' : 'días'}`;
  }

  const totalWeeks = Math.floor(totalDays / 7);
  if (totalWeeks < 8) {
    return `${totalWeeks} ${totalWeeks === 1 ? 'semana' : 'semanas'}`;
  }

  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) +
    (now.getDate() < birth.getDate() ? -1 : 0);

  if (months < 1) {
    return `${totalWeeks} ${totalWeeks === 1 ? 'semana' : 'semanas'}`;
  }

  return `${months} ${months === 1 ? 'mes' : 'meses'}`;
}

function getFeedingDetail(event: FeedingEvent): string {
  const details = [
    event.amountMilliliters ? `${event.amountMilliliters} ml` : undefined,
    event.breastSide ? breastSideLabels[event.breastSide] : undefined,
  ].filter(Boolean);

  return details.join(' · ') || 'Sin detalles adicionales';
}

function formatWeight(weightGrams: number): string {
  return `${new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
  }).format(weightGrams / 1000)} kg`;
}

function getWeightProgressDescription(differenceGrams: number): string {
  const formattedDifference = new Intl.NumberFormat('es-ES').format(
    Math.abs(differenceGrams),
  );

  if (differenceGrams > 0) {
    return `Ha ganado ${formattedDifference} g desde el nacimiento.`;
  }

  if (differenceGrams < 0) {
    return `Está ${formattedDifference} g por debajo de su peso al nacer.`;
  }

  return 'Mantiene su peso de nacimiento.';
}

function getMeasurementDetail(event: MeasurementEvent): string {
  const values = [
    event.weightGrams !== undefined
      ? formatWeight(event.weightGrams)
      : undefined,
    event.lengthMillimeters !== undefined
      ? `${new Intl.NumberFormat('es-ES', {
          maximumFractionDigits: 1,
        }).format(event.lengthMillimeters / 10)} cm`
      : undefined,
    event.headCircumferenceMillimeters !== undefined
      ? `PC ${new Intl.NumberFormat('es-ES', {
          maximumFractionDigits: 1,
        }).format(event.headCircumferenceMillimeters / 10)} cm`
      : undefined,
  ].filter(Boolean);

  return `${values.join(' · ')} · ${
    measurementSourceLabels[event.source] ?? event.source
  }`;
}

function getEventPresentation(event: CareEvent, now: Date) {
  if (event.type === 'feeding') {
    return {
      accent: colors.coral,
      description: getFeedingDetail(event),
      icon: event.icon ?? Milk,
      title: feedingLabels[event.method],
    };
  }

  if (event.type === 'diaper') {
    return {
      accent: colors.butter,
      description: event.notes || 'Cambio de pañal',
      icon: event.icon ?? BabyIcon,
      title: diaperLabels[event.condition],
    };
  }

  if (event.type === 'measurement') {
    return {
      accent: colors.aqua,
      description: getMeasurementDetail(event),
      icon: event.icon ?? Scale,
      title: 'Medidas de crecimiento',
    };
  }

  if (event.type === 'note') {
    return {
      accent: colors.primary,
      description: event.content,
      icon: event.icon ?? NotebookPen,
      title: 'Nota familiar',
    };
  }

  return {
    accent: colors.lavender,
    description: event.endedAt
      ? `Durmió ${formatDuration(
          getDurationMinutes(event.occurredAt, event.endedAt),
        )}`
      : `Durmiendo ${formatDuration(
          getDurationMinutes(event.occurredAt, now.toISOString()),
        )}`,
    icon: event.icon ?? Moon,
    title: event.endedAt ? 'Sueño terminado' : 'Sueño en curso',
  };
}

function TimelineEvent({
  event,
  now,
}: {
  event: CareEvent;
  now: Date;
}) {
  const presentation = getEventPresentation(event, now);

  return (
    <View style={styles.timelineEvent}>
      <View
        style={[
          styles.timelineGlyph,
          { backgroundColor: `${presentation.accent}22` },
        ]}
      >
        <presentation.icon color={presentation.accent} size={18} />
      </View>
      <View style={styles.timelineCopy}>
        <View style={styles.timelineTitleRow}>
          <Text style={styles.timelineTitle}>{presentation.title}</Text>
          <Text style={styles.timelineTime}>
            {formatWhen(event.occurredAt, now)}
          </Text>
        </View>
        <Text style={styles.timelineDescription}>
          {presentation.description}
        </Text>
        {event.notes && event.type !== 'diaper' ? (
          <Text style={styles.timelineNote}>“{event.notes}”</Text>
        ) : null}
        <View style={styles.timelineAuthorRow}>
          <AnimalAvatar
            accessibilityLabel={`Avatar de ${event.recordedByName || 'un familiar'}`}
            photoUrl={event.recordedByAvatarUrl}
            size={24}
            variant={event.recordedByAvatarKey ?? resolveStableMemberAvatar(event.recordedById)}
          />
          <Text style={styles.timelineAuthor}>Registrado por {event.recordedByName || 'un familiar'}</Text>
        </View>
      </View>
    </View>
  );
}

function QuickActionsSection({
  compact = false,
  isSleeping,
  onAction,
}: {
  compact?: boolean;
  isSleeping: boolean;
  onAction: (action: CareAction) => void;
}) {
  return (
    <View style={styles.quickActionsSection}>
      <View>
        <Text style={styles.sectionTitle}>Registrar ahora</Text>
        <Text style={styles.sectionSubtitle}>
          Dos toques y queda compartido con la familia.
        </Text>
      </View>
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onAction('feeding')}
          style={({ pressed }) => [
            styles.actionButton,
            styles.feedingAction,
            compact && styles.primaryActionCompact,
            pressed && styles.actionPressed,
          ]}
        >
          <Milk color={colors.text} size={20} />
          <Text
            numberOfLines={1}
            style={[styles.actionLabel, compact && styles.actionLabelCompact]}
          >
            Alimentación
          </Text>
          <View style={styles.actionArrow}>
            <Plus color={colors.text} size={18} />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onAction('diaper')}
          style={({ pressed }) => [
            styles.actionButton,
            styles.diaperAction,
            compact && styles.primaryActionCompact,
            pressed && styles.actionPressed,
          ]}
        >
          <BabyIcon color={colors.text} size={20} />
          <Text
            numberOfLines={1}
            style={[styles.actionLabel, compact && styles.actionLabelCompact]}
          >
            Pañal
          </Text>
          <View style={styles.actionArrow}>
            <Plus color={colors.text} size={18} />
          </View>
        </Pressable>
        {!compact ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onAction('sleep')}
            style={({ pressed }) => [
              styles.actionButton,
              styles.sleepAction,
              pressed && styles.actionPressed,
            ]}
          >
            <Moon color={colors.text} size={20} />
            <Text style={styles.actionLabel}>
              {isSleeping ? 'Despertó' : 'Se durmió'}
            </Text>
            <View style={styles.actionArrow}>
              {isSleeping ? (
                <Check color={colors.text} size={18} />
              ) : (
                <Plus color={colors.text} size={18} />
              )}
            </View>
          </Pressable>
        ) : null}
      </View>
      <View
        style={[
          styles.secondaryActions,
          compact && styles.secondaryActionsCompact,
        ]}
      >
        {compact ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onAction('sleep')}
            style={({ pressed }) => [
              styles.secondaryAction,
              styles.secondaryActionCompact,
              pressed && styles.actionPressed,
            ]}
          >
            <Moon color={colors.lavender} size={18} />
            <Text style={styles.secondaryActionLabel}>
              {isSleeping ? 'Despertó' : 'Dormir'}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => onAction('measurement')}
          style={({ pressed }) => [
            styles.secondaryAction,
            compact && styles.secondaryActionCompact,
            pressed && styles.actionPressed,
          ]}
        >
          <Scale color={colors.primaryPressed} size={17} />
          <Text style={styles.secondaryActionLabel}>
            {compact ? 'Medidas' : 'Registrar medidas'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onAction('note')}
          style={({ pressed }) => [
            styles.secondaryAction,
            compact && styles.secondaryActionCompact,
            pressed && styles.actionPressed,
          ]}
        >
          <NotebookPen color={colors.primaryPressed} size={17} />
          <Text style={styles.secondaryActionLabel}>
            {compact ? 'Nota' : 'Añadir nota'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuickActionPicker({
  isSleeping,
  onClose,
  onSelect,
  visible,
}: {
  isSleeping: boolean;
  onClose: () => void;
  onSelect: (action: CareAction) => void;
  visible: boolean;
}) {
  const quickActionOptions: readonly {
    action: CareAction;
    accent: string;
    icon: LucideIcon;
    label: string;
  }[] = [
    { action: 'feeding', accent: colors.coral, icon: Milk, label: 'Alimentación' },
    { action: 'diaper', accent: colors.butter, icon: BabyIcon, label: 'Pañal' },
    { action: 'sleep', accent: colors.lavender, icon: Moon, label: 'Sueño' },
    { action: 'measurement', accent: colors.aqua, icon: Scale, label: 'Medidas' },
    { action: 'note', accent: colors.primary, icon: NotebookPen, label: 'Nota' },
  ];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.pickerBackdrop}>
        <Pressable
          accessibilityLabel="Cerrar opciones de registro"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.pickerDismissArea}
        />
        <SafeAreaView edges={['bottom']} style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHeading}>
            <View style={styles.pickerHeadingCopy}>
              <Text style={styles.eyebrow}>Registro rápido</Text>
              <Text style={styles.pickerTitle}>¿Qué quieres registrar?</Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.pickerCloseButton,
                pressed && styles.actionPressed,
              ]}
            >
              <Plus color={colors.text} size={22} style={styles.pickerCloseIcon} />
            </Pressable>
          </View>
          <View style={styles.pickerOptions}>
            {quickActionOptions.map(({ action, accent, icon: Icon, label }) => (
              <Pressable
                accessibilityRole="button"
                key={action}
                onPress={() => onSelect(action)}
                style={({ pressed }) => [
                  styles.pickerOption,
                  pressed && styles.actionPressed,
                ]}
              >
                <View
                  style={[
                    styles.pickerOptionIcon,
                    { backgroundColor: `${accent}22` },
                  ]}
                >
                  <Icon color={accent} size={20} />
                </View>
                <Text style={styles.pickerOptionLabel}>
                  {action === 'sleep' && isSleeping ? 'Despertó' : label}
                </Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function DashboardContent({
  dashboard,
  isRefreshing,
  now,
  onAction,
  onOpenBabyProfile,
  onQuickActionsLayout,
  onRefresh,
  storiesContent,
}: {
  dashboard: CareDashboard;
  isRefreshing: boolean;
  now: Date;
  onAction: (action: CareAction) => void;
  onOpenBabyProfile: () => void;
  onQuickActionsLayout?: (layout: LayoutRectangle) => void;
  onRefresh: () => void;
  storiesContent?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const isCompact = width < 640;
  const snapshot = useMemo(
    () => getCareSnapshot(dashboard.events),
    [dashboard.events],
  );
  const feeding = snapshot.latestFeeding;
  const diaper = snapshot.latestDiaper;
  const openSleep = snapshot.openSleep;
  const finishedSleep = snapshot.latestFinishedSleep;
  const measurement = snapshot.latestMeasurement;
  const isExpected = dashboard.baby.lifeStage === 'expected';
  const ageLabel = formatBabyAgeLabel(dashboard.baby.birthDate, now);
  const weightProgress = getBabyWeightProgress(
    dashboard.weightMeasurements,
    now,
  );

  return (
    <>
      <ScreenHero
        eyebrow="Relevo familiar"
        subtitle={
          isExpected
            ? 'Aquí tendréis lo esencial para coordinar los cuidados desde el primer día.'
            : ageLabel
              ? `Qué alegría tener a ${dashboard.baby.name} ya con ${ageLabel} de vida.`
              : 'Lo esencial para continuar los cuidados sin depender de la memoria.'
        }
        title={
          isExpected
            ? `Preparando el relevo de ${dashboard.baby.name}`
            : `Así está ${dashboard.baby.name}`
        }
      >
        {!isExpected && weightProgress ? (
          <View style={styles.weightProgress}>
            <View style={styles.weightProgressIcon}>
              <Scale color={colors.primaryPressed} size={17} />
            </View>
            <View style={styles.weightProgressCopy}>
              <Text style={styles.weightProgressWeight}>
                {dashboard.baby.name} pesa ahora{' '}
                {formatWeight(weightProgress.currentWeightGrams)}.
              </Text>
              <Text style={styles.weightProgressChange}>
                {getWeightProgressDescription(weightProgress.differenceGrams)}
              </Text>
            </View>
          </View>
        ) : null}
      </ScreenHero>

      {!isExpected && dashboard.canRecord ? (
        <View
          onLayout={(event) => onQuickActionsLayout?.(event.nativeEvent.layout)}
        >
          <QuickActionsSection
            compact={isCompact}
            isSleeping={Boolean(openSleep)}
            onAction={onAction}
          />
        </View>
      ) : null}

      {storiesContent}

      <View style={styles.summaryGrid}>
        <SummaryCard
          accent={colors.coral}
          detail={feeding ? getFeedingDetail(feeding) : 'Todavía sin registros'}
          icon={Milk}
          title="Última alimentación"
          value={feeding ? formatWhen(feeding.occurredAt, now) : 'Sin datos'}
        />
        <SummaryCard
          accent={colors.butter}
          detail={diaper ? diaperLabels[diaper.condition] : 'Todavía sin registros'}
          icon={BabyIcon}
          title="Último pañal"
          value={diaper ? formatWhen(diaper.occurredAt, now) : 'Sin datos'}
        />
        <SummaryCard
          accent={colors.lavender}
          detail={
            openSleep
              ? `Desde ${formatWhen(openSleep.occurredAt, now).toLowerCase()}`
              : finishedSleep?.endedAt
                ? `Duró ${formatDuration(
                    getDurationMinutes(
                      finishedSleep.occurredAt,
                      finishedSleep.endedAt,
                    ),
                  )}`
                : 'Todavía sin registros'
          }
          icon={Moon}
          title="Sueño"
          value={
            openSleep
              ? 'Durmiendo ahora'
              : finishedSleep?.endedAt
                ? formatWhen(finishedSleep.endedAt, now)
                : 'Sin datos'
          }
        />
        <SummaryCard
          accent={colors.aqua}
          detail={
            measurement
              ? getMeasurementDetail(measurement)
              : 'Todavía sin registros'
          }
          icon={Scale}
          title="Últimas medidas"
          value={
            measurement?.weightGrams !== undefined
              ? formatWeight(measurement.weightGrams)
              : measurement
                ? formatWhen(measurement.occurredAt, now)
                : 'Sin datos'
          }
        />
      </View>

      {isExpected ? (
        <View style={styles.expectedNotice}>
          <View style={styles.expectedNoticeCopy}>
            <Text style={styles.expectedNoticeTitle}>
              Todo listo para cuando nazca
            </Text>
            <Text style={styles.expectedNoticeText}>
              Los registros se activarán al cambiar el perfil a “ya nació”.
              Así evitamos guardar cuidados por error antes del nacimiento.
            </Text>
          </View>
          <Pressable
            onPress={onOpenBabyProfile}
            style={({ pressed }) => [
              styles.expectedButton,
              pressed && styles.actionPressed,
            ]}
          >
            <Text style={styles.expectedButtonText}>Ver perfil</Text>
          </Pressable>
        </View>
      ) : !dashboard.canRecord ? (
        <View style={styles.readOnlyNotice}>
          <Text style={styles.readOnlyTitle}>Vista de solo lectura</Text>
          <Text style={styles.readOnlyText}>
            Puedes consultar el relevo. Un administrador puede cambiar tu rol si
            necesitas registrar cuidados.
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Actividad reciente</Text>
            <Text style={styles.sectionSubtitle}>
              Los últimos cuidados para preparar el relevo.
            </Text>
          </View>
          <View style={styles.sectionActions}>
            <Pressable
              accessibilityLabel="Actualizar registros"
              onPress={onRefresh}
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.refreshButtonPressed,
              ]}
            >
              <RefreshCw
                color={colors.primaryPressed}
                size={16}
                style={isRefreshing ? styles.refreshIconSpin : undefined}
              />
            </Pressable>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text numberOfLines={1} style={styles.liveText}>
                En directo
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.timeline}>
          {dashboard.events.length > 0 ? (
            dashboard.events.slice(0, 20).map((event) => (
              <TimelineEvent event={event} key={event.id} now={now} />
            ))
          ) : (
            <View style={styles.emptyTimeline}>
              <Star color={colors.butter} size={34} />
              <Text style={styles.emptyTimelineTitle}>
                {dashboard.events.length > 0
                  ? 'No hay registros con este filtro'
                  : 'El relevo empieza aquí'}
              </Text>
              <Text style={styles.emptyTimelineText}>
                {dashboard.events.length > 0
                  ? 'Prueba otro tipo de cuidado, otro día o vuelve a mostrar todo.'
                  : 'El primer registro aparecerá en esta cronología para toda la familia.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );
}

export function CareHandoffScreen({
  babyId: selectedBabyId,
  canCreateBaby,
  onOpenBabyProfile,
  repository,
  storiesContent,
  topContent,
  userId,
}: CareHandoffScreenProps) {
  const { width } = useWindowDimensions();
  const [dashboard, setDashboard] = useState<CareDashboard | null>();
  const [isLoading, setIsLoading] = useState(Boolean(selectedBabyId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [action, setAction] = useState<CareAction>();
  const [isQuickActionPickerOpen, setIsQuickActionPickerOpen] = useState(false);
  const [showQuickActionAccess, setShowQuickActionAccess] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const quickActionsLayout = useRef<LayoutRectangle | null>(null);
  const scrollOffset = useRef(0);
  const scrollViewportHeight = useRef(0);
  const isCompact = width < 640;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    if (!selectedBabyId) {
      return () => {
        active = false;
      };
    }

    void repository
      .load(userId, selectedBabyId)
      .then((loadedDashboard) => {
        if (active) {
          setLoadError(false);
          setDashboard(loadedDashboard);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, repository, selectedBabyId, userId]);

  const babyId = dashboard?.baby.id;

  useEffect(() => {
    if (!babyId) {
      return;
    }

    const reload = () => {
      setLoadAttempt((current) => current + 1);
    };
    const unsubscribeRepository = repository.subscribe(babyId, reload);
    const unsubscribeNotifications = subscribeToCareDataChanges(reload);

    return () => {
      unsubscribeRepository();
      unsubscribeNotifications();
    };
  }, [babyId, repository]);

  const snapshot = dashboard ? getCareSnapshot(dashboard.events) : undefined;

  function handleRefresh() {
    setIsRefreshing(true);
    setLoadAttempt((current) => current + 1);
  }

  function updateQuickActionAccess(scrollOffset: number) {
    const layout = quickActionsLayout.current;
    const viewportHeight = scrollViewportHeight.current;

    if (!isCompact || !layout || viewportHeight === 0) {
      setShowQuickActionAccess(false);
      return;
    }

    const nativeNavigationInset = Platform.OS === 'web' ? 0 : 72;
    const shouldShow = shouldShowQuickActionAccess(layout, {
      bottomInset: nativeNavigationInset + spacing.sm,
      height: viewportHeight,
      scrollOffset,
      topInset: spacing.sm,
    });

    setShowQuickActionAccess((current) =>
      current === shouldShow ? current : shouldShow,
    );
  }

  function handleQuickActionsLayout(layout: LayoutRectangle) {
    quickActionsLayout.current = layout;
    updateQuickActionAccess(scrollOffset.current);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
    updateQuickActionAccess(scrollOffset.current);
  }

  function handleSelectQuickAction(selectedAction: CareAction) {
    setIsQuickActionPickerOpen(false);
    setAction(selectedAction);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateScreen}>
          <NuniMascot size={170} />
          <Text style={styles.stateTitle}>Preparando el relevo…</Text>
          <Text style={styles.stateText}>
            Estamos reuniendo los cuidados más recientes.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateScreen}>
          <CloudSun color={colors.lavender} size={56} />
          <Text style={styles.stateTitle}>No pudimos cargar el relevo</Text>
          <Text style={styles.stateText}>
            Comprueba la conexión y vuelve a intentarlo.
          </Text>
          <Pressable
            onPress={() => {
              setIsLoading(true);
              setLoadError(false);
              setLoadAttempt((current) => current + 1);
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!dashboard) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.content}>
            {topContent}
            <View style={styles.setupCard}>
              <NuniMascot size={190} />
              <Text style={styles.setupEyebrow}>Relevo familiar</Text>
              <Text style={styles.setupTitle}>
                {canCreateBaby
                  ? 'Primero necesitamos el perfil del bebé'
                  : 'Esta familia todavía no tiene un bebé'}
              </Text>
              <Text style={styles.setupText}>
                {canCreateBaby
                  ? 'El relevo se vincula a un bebé para mantener los datos separados y protegidos dentro de la familia.'
                  : 'Cuando un administrador cree el perfil, podrás consultar aquí el relevo familiar.'}
              </Text>
              {canCreateBaby ? (
                <Pressable
                  onPress={onOpenBabyProfile}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Crear perfil</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        onLayout={(event: LayoutChangeEvent) => {
          scrollViewportHeight.current = event.nativeEvent.layout.height;
          updateQuickActionAccess(scrollOffset.current);
        }}
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        <View style={styles.content}>
          {topContent}
          <DashboardContent
            dashboard={dashboard}
            isRefreshing={isRefreshing}
            now={now}
            onAction={setAction}
            onOpenBabyProfile={onOpenBabyProfile}
            onQuickActionsLayout={handleQuickActionsLayout}
            onRefresh={handleRefresh}
            storiesContent={storiesContent}
          />
        </View>
      </ScrollView>
      {isCompact && showQuickActionAccess && !action && !isQuickActionPickerOpen ? (
        <Pressable
          accessibilityHint="Abre las opciones para registrar un cuidado"
          accessibilityLabel="Registrar cuidado"
          accessibilityRole="button"
          onPress={() => setIsQuickActionPickerOpen(true)}
          style={({ pressed }) => [
            styles.floatingQuickAction,
            Platform.OS !== 'web' && styles.floatingQuickActionNative,
            pressed && styles.floatingQuickActionPressed,
          ]}
        >
          <Plus color={colors.onAccent} size={20} />
          <Text style={styles.floatingQuickActionText}>Registrar cuidado</Text>
        </Pressable>
      ) : null}
      <QuickActionPicker
        isSleeping={Boolean(snapshot?.openSleep)}
        onClose={() => setIsQuickActionPickerOpen(false)}
        onSelect={handleSelectQuickAction}
        visible={isQuickActionPickerOpen}
      />
      <CareActionSheet
        action={action}
        babyId={dashboard.baby.id}
        onClose={() => setAction(undefined)}
        onSaved={() => setLoadAttempt((current) => current + 1)}
        openSleep={snapshot?.openSleep}
        repository={repository}
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: 72,
  },
  content: {
    gap: spacing.xl,
    maxWidth: 920,
    width: '100%',
  },
  eyebrow: {
    color: colors.primaryPressed,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  weightProgress: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: `${colors.aqua}55`,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    maxWidth: 470,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  weightProgressChange: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  weightProgressCopy: {
    flex: 1,
  },
  weightProgressIcon: {
    alignItems: 'center',
    backgroundColor: `${colors.aqua}26`,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  weightProgressWeight: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderTopWidth: 5,
    flex: 1,
    gap: spacing.sm,
    minWidth: 220,
    padding: spacing.lg,
  },
  summaryHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryIconBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  summaryTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  summaryDetail: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  section: { gap: spacing.md },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  quickActionsSection: {
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionsCompact: {
    flexWrap: 'nowrap',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 62,
    minWidth: 190,
    paddingHorizontal: spacing.lg,
  },
  primaryActionCompact: {
    flexBasis: 0,
    minHeight: 58,
    minWidth: 0,
    paddingHorizontal: spacing.md,
  },
  feedingAction: { backgroundColor: colors.peach },
  diaperAction: { backgroundColor: colors.butterSoft },
  sleepAction: { backgroundColor: colors.lavenderSoft },
  actionPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  actionLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  actionLabelCompact: {
    fontSize: 13,
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  secondaryActionsCompact: {
    flexWrap: 'nowrap',
  },
  secondaryAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  secondaryActionCompact: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  secondaryActionLabel: {
    color: colors.primaryPressed,
    fontSize: 12,
    fontWeight: '900',
  },
  actionArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingQuickAction: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    bottom: spacing.lg,
    elevation: 8,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.xl,
    position: 'absolute',
    shadowColor: colors.text,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    zIndex: 3,
  },
  floatingQuickActionNative: {
    bottom: 82,
  },
  floatingQuickActionPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.98 }],
  },
  floatingQuickActionText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: '900',
  },
  pickerBackdrop: {
    backgroundColor: 'rgba(24, 35, 75, 0.58)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerDismissArea: {
    flex: 1,
  },
  pickerSheet: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: spacing.lg,
    maxWidth: 640,
    padding: spacing.lg,
    width: '100%',
  },
  pickerHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 5,
    width: 48,
  },
  pickerHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  pickerHeadingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  pickerTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 29,
  },
  pickerCloseButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pickerCloseIcon: {
    transform: [{ rotate: '45deg' }],
  },
  pickerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pickerOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 64,
    minWidth: 140,
    paddingHorizontal: spacing.md,
  },
  pickerOptionIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  pickerOptionLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  readOnlyNotice: {
    backgroundColor: colors.butterSoft,
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  readOnlyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  readOnlyText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  expectedNotice: {
    alignItems: 'center',
    backgroundColor: colors.butterSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  expectedNoticeCopy: { flex: 1, gap: spacing.xs },
  expectedNoticeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  expectedNoticeText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  expectedButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  expectedButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: 'auto',
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  refreshButtonPressed: { opacity: 0.72 },
  refreshIconSpin: {
    transform: [{ rotate: '180deg' }],
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  liveDot: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  liveText: {
    color: colors.primaryPressed,
    fontSize: 12,
    fontWeight: '900',
  },
  timeline: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  timelineEvent: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  timelineGlyph: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  timelineGlyphText: { fontSize: 20, fontWeight: '900' },
  timelineCopy: { flex: 1, gap: spacing.xs },
  timelineTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  timelineTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  timelineTime: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  timelineDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  timelineNote: {
    color: colors.text,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  timelineAuthor: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  timelineAuthorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  emptyTimeline: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  emptyTimelineTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyTimelineText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 380,
    textAlign: 'center',
  },
  stateScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    maxWidth: 420,
    textAlign: 'center',
  },
  setupCard: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.lg,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  setupEyebrow: {
    color: colors.primaryPressed,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  setupTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    maxWidth: 560,
    textAlign: 'center',
  },
  setupText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
    maxWidth: 540,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed },
  primaryButtonText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '900',
  },
}));
