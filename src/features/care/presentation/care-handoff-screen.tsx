import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  filterCareEvents,
  type CareEventFilter,
} from '@/features/care/application/care-history';
import {
  getCareSnapshot,
  getDurationMinutes,
} from '@/features/care/application/care-snapshot';
import type { CareRepository } from '@/features/care/application/care-repository';
import type {
  CareDashboard,
  CareEvent,
  DiaperEvent,
  FeedingEvent,
} from '@/features/care/domain/care-event';
import {
  CareActionSheet,
  type CareAction,
} from '@/features/care/presentation/care-action-sheet';
import { CareHistoryControls } from '@/features/care/presentation/care-history-controls';
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

interface CareHandoffScreenProps {
  exportHistory: (events: CareEvent[], babyName: string) => Promise<void>;
  onOpenBabyProfile: () => void;
  repository: CareRepository;
  topContent?: ReactNode;
  userId: string;
}

interface SummaryCardProps {
  accent: string;
  detail: string;
  glyph: string;
  title: string;
  value: string;
}

function SummaryCard({
  accent,
  detail,
  glyph,
  title,
  value,
}: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: accent }]}>
      <View style={styles.summaryHeading}>
        <Text style={[styles.summaryGlyph, { color: accent }]}>{glyph}</Text>
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

function getFeedingDetail(event: FeedingEvent): string {
  const details = [
    event.amountMilliliters ? `${event.amountMilliliters} ml` : undefined,
    event.breastSide ? breastSideLabels[event.breastSide] : undefined,
  ].filter(Boolean);

  return details.join(' · ') || 'Sin detalles adicionales';
}

function getEventPresentation(event: CareEvent, now: Date) {
  if (event.type === 'feeding') {
    return {
      accent: colors.coral,
      description: getFeedingDetail(event),
      glyph: '●',
      title: feedingLabels[event.method],
    };
  }

  if (event.type === 'diaper') {
    return {
      accent: colors.butter,
      description: event.notes || 'Cambio de pañal',
      glyph: '◆',
      title: diaperLabels[event.condition],
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
    glyph: '☾',
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
        <Text style={[styles.timelineGlyphText, { color: presentation.accent }]}>
          {presentation.glyph}
        </Text>
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
  now,
  onAction,
  onExport,
  onOpenBabyProfile,
}: {
  dashboard: CareDashboard;
  now: Date;
  onAction: (action: CareAction) => void;
  onExport: (events: CareEvent[], babyName: string) => Promise<void>;
  onOpenBabyProfile: () => void;
}) {
  const [eventFilter, setEventFilter] = useState<CareEventFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string>();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const snapshot = useMemo(
    () => getCareSnapshot(dashboard.events),
    [dashboard.events],
  );
  const feeding = snapshot.latestFeeding;
  const diaper = snapshot.latestDiaper;
  const openSleep = snapshot.openSleep;
  const finishedSleep = snapshot.latestFinishedSleep;
  const isExpected = dashboard.baby.lifeStage === 'expected';
  const filteredEvents = useMemo(
    () => filterCareEvents(dashboard.events, eventFilter, selectedDate),
    [dashboard.events, eventFilter, selectedDate],
  );

  async function handleExport() {
    setIsExporting(true);
    setExportError(false);

    try {
      await onExport(filteredEvents, dashboard.baby.name);
    } catch {
      setExportError(true);
    } finally {
      setIsExporting(false);
    }
  }

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
              : 'Lo esencial para continuar los cuidados sin depender de la memoria.'}
          </Text>
        </View>
        <NuniMascot size={138} />
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard
          accent={colors.coral}
          detail={feeding ? getFeedingDetail(feeding) : 'Todavía sin registros'}
          glyph="●"
          title="Última alimentación"
          value={feeding ? formatWhen(feeding.occurredAt, now) : 'Sin datos'}
        />
        <SummaryCard
          accent={colors.butter}
          detail={diaper ? diaperLabels[diaper.condition] : 'Todavía sin registros'}
          glyph="◆"
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
          glyph="☾"
          title="Sueño"
          value={
            openSleep
              ? 'Durmiendo ahora'
              : finishedSleep?.endedAt
                ? formatWhen(finishedSleep.endedAt, now)
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
              <Text style={styles.actionGlyph}>●</Text>
              <Text style={styles.actionLabel}>Alimentación</Text>
              <Text style={styles.actionArrow}>＋</Text>
            </Pressable>
            <Pressable
              onPress={() => onAction('diaper')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.diaperAction,
                pressed && styles.actionPressed,
              ]}
            >
              <Text style={styles.actionGlyph}>◆</Text>
              <Text style={styles.actionLabel}>Pañal</Text>
              <Text style={styles.actionArrow}>＋</Text>
            </Pressable>
            <Pressable
              onPress={() => onAction('sleep')}
              style={({ pressed }) => [
                styles.actionButton,
                styles.sleepAction,
                pressed && styles.actionPressed,
              ]}
            >
              <Text style={styles.actionGlyph}>☾</Text>
              <Text style={styles.actionLabel}>
                {openSleep ? 'Despertó' : 'Se durmió'}
              </Text>
              <Text style={styles.actionArrow}>{openSleep ? '✓' : '＋'}</Text>
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
        <CareHistoryControls
          eventFilter={eventFilter}
          events={dashboard.events}
          exportCount={filteredEvents.length}
          isExporting={isExporting}
          onChangeDate={setSelectedDate}
          onChangeFilter={setEventFilter}
          onExport={() => void handleExport()}
          selectedDate={selectedDate}
        />
        {exportError ? (
          <Text accessibilityRole="alert" style={styles.exportError}>
            No pudimos crear el archivo. Inténtalo de nuevo.
          </Text>
        ) : null}
        {dashboard.hasOlderEvents ? (
          <Text style={styles.historyLimitNotice}>
            Se muestran los 1000 registros más recientes. La paginación del
            historial antiguo se añadirá antes de cerrar el MVP.
          </Text>
        ) : null}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Lo más reciente</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredEvents.length}{' '}
              {filteredEvents.length === 1 ? 'registro visible' : 'registros visibles'}.
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>En directo</Text>
          </View>
        </View>

        <View style={styles.timeline}>
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <TimelineEvent event={event} key={event.id} now={now} />
            ))
          ) : (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyTimelineGlyph}>☆</Text>
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
  exportHistory,
  onOpenBabyProfile,
  repository,
  topContent,
  userId,
}: CareHandoffScreenProps) {
  const [dashboard, setDashboard] = useState<CareDashboard | null>();
  const [isLoading, setIsLoading] = useState(true);
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

    void repository
      .load(userId)
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
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, repository, userId]);

  const babyId = dashboard?.baby.id;

  useEffect(() => {
    if (!babyId) {
      return;
    }

    return repository.subscribe(babyId, () => {
      setLoadAttempt((current) => current + 1);
    });
  }, [babyId, repository]);

  const snapshot = dashboard ? getCareSnapshot(dashboard.events) : undefined;

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
          <Text style={styles.stateGlyph}>☁</Text>
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
                Primero necesitamos el perfil del bebé
              </Text>
              <Text style={styles.setupText}>
                El relevo se vincula a un bebé para mantener los datos separados
                y protegidos dentro de la familia.
              </Text>
              <Pressable
                onPress={onOpenBabyProfile}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Crear perfil
                </Text>
              </Pressable>
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
            now={now}
            onAction={setAction}
            onExport={exportHistory}
            onOpenBabyProfile={onOpenBabyProfile}
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
  summaryGlyph: { fontSize: 18, fontWeight: '900' },
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
  actionGlyph: { color: colors.text, fontSize: 20, fontWeight: '900' },
  actionLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  actionArrow: { color: colors.text, fontSize: 22, fontWeight: '900' },
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
  exportError: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
  historyLimitNotice: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
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
  emptyTimelineGlyph: {
    color: colors.butter,
    fontSize: 42,
    fontWeight: '900',
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
  stateGlyph: { color: colors.lavender, fontSize: 58 },
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
