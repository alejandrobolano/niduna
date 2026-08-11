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
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CareRepository } from '@/features/care/application/care-repository';
import { subscribeToCareDataChanges } from '@/features/care/application/care-data-events';
import { getBabyWeightProgress } from '@/features/care/application/baby-weight-progress';
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
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, radius, spacing } from '@/shared/presentation/theme';

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
        <Text style={styles.timelineAuthor}>
          Registrado por {event.recordedByName || 'un familiar'}
        </Text>
      </View>
    </View>
  );
}

function DashboardContent({
  dashboard,
  isRefreshing,
  now,
  onAction,
  onOpenBabyProfile,
  onRefresh,
  storiesContent,
}: {
  dashboard: CareDashboard;
  isRefreshing: boolean;
  now: Date;
  onAction: (action: CareAction) => void;
  onOpenBabyProfile: () => void;
  onRefresh: () => void;
  storiesContent?: ReactNode;
}) {
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
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>Relevo familiar</Text>
          <Text style={styles.heroTitle}>
            {isExpected
              ? `Preparando el relevo de ${dashboard.baby.name}`
              : `Así está ${dashboard.baby.name}`}
          </Text>
          <Text style={styles.heroText}>
            {isExpected
              ? 'Aquí tendréis lo esencial para coordinar los cuidados desde el primer día.'
              : ageLabel
                ? `Qué alegría tener a ${dashboard.baby.name} ya con ${ageLabel} de vida.`
                : 'Lo esencial para continuar los cuidados sin depender de la memoria.'}
          </Text>
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
        </View>
        <NuniMascot size={138} />
      </View>

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
      ) : dashboard.canRecord ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Registrar ahora</Text>
              <Text style={styles.sectionSubtitle}>
                Dos toques y queda compartido con la familia.
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={() => onAction('feeding')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.feedingAction,
                pressed && styles.actionPressed,
              ]}
            >
              <Milk color={colors.text} size={20} />
              <Text style={styles.actionLabel}>Alimentación</Text>
              <View style={styles.actionArrow}>
                <Plus color={colors.text} size={18} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => onAction('diaper')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.diaperAction,
                pressed && styles.actionPressed,
              ]}
            >
              <BabyIcon color={colors.text} size={20} />
              <Text style={styles.actionLabel}>Pañal</Text>
              <View style={styles.actionArrow}>
                <Plus color={colors.text} size={18} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => onAction('sleep')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.sleepAction,
                pressed && styles.actionPressed,
              ]}
            >
              <Moon color={colors.text} size={20} />
              <Text style={styles.actionLabel}>
                {openSleep ? 'Despertó' : 'Se durmió'}
              </Text>
              <View style={styles.actionArrow}>
                {openSleep ? (
                  <Check color={colors.text} size={18} />
                ) : (
                  <Plus color={colors.text} size={18} />
                )}
              </View>
            </Pressable>
          </View>
          <View style={styles.secondaryActions}>
            <Pressable
              onPress={() => onAction('measurement')}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && styles.actionPressed,
              ]}
            >
              <Scale color={colors.primaryPressed} size={17} />
              <Text style={styles.secondaryActionLabel}>Registrar medidas</Text>
            </Pressable>
            <Pressable
              onPress={() => onAction('note')}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && styles.actionPressed,
              ]}
            >
              <NotebookPen color={colors.primaryPressed} size={17} />
              <Text style={styles.secondaryActionLabel}>Añadir nota</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.readOnlyNotice}>
          <Text style={styles.readOnlyTitle}>Vista de solo lectura</Text>
          <Text style={styles.readOnlyText}>
            Puedes consultar el relevo. Un administrador puede cambiar tu rol si
            necesitas registrar cuidados.
          </Text>
        </View>
      )}

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
  const [dashboard, setDashboard] = useState<CareDashboard | null>();
  const [isLoading, setIsLoading] = useState(Boolean(selectedBabyId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [action, setAction] = useState<CareAction>();
  const [now, setNow] = useState(() => new Date());

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
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          {topContent}
          <DashboardContent
            dashboard={dashboard}
            isRefreshing={isRefreshing}
            now={now}
            onAction={setAction}
            onOpenBabyProfile={onOpenBabyProfile}
            onRefresh={handleRefresh}
            storiesContent={storiesContent}
          />
        </View>
      </ScrollView>
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

const styles = StyleSheet.create({
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
  hero: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.lg,
    flexDirection: 'row',
    minHeight: 190,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  heroCopy: { flex: 1, gap: spacing.sm },
  eyebrow: {
    color: colors.primaryPressed,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  heroText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 470,
  },
  weightProgress: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    minHeight: 40,
    paddingHorizontal: spacing.md,
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
    height: 34,
    justifyContent: 'center',
    width: 34,
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
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
});
