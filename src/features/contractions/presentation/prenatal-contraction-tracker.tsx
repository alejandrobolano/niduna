import {
  AlertTriangle,
  Clock3,
  Phone,
  Plus,
  Square,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import type { BabyContactRepository } from '@/features/baby-contacts/application/baby-contact-repository';
import { callBabyContact } from '@/features/baby-contacts/infrastructure/baby-contact-actions';
import type { ContractionRepository } from '@/features/contractions/application/contraction-repository';
import { ContractionError } from '@/features/contractions/application/contraction-repository';
import {
  formatContractionInterval,
  formatTimer,
  getContractionDurationSeconds,
  getContractionIntervalSeconds,
  type Contraction,
} from '@/features/contractions/domain/contraction';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface PrenatalContractionTrackerProps {
  babyId: string;
  canManage: boolean;
  canRecord: boolean;
  contactRepository: BabyContactRepository;
  contractionRepository: ContractionRepository;
  onOpenContacts: () => void;
  userId: string;
}

function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ContractionError) {
    if (error.reason === 'already_active') {
      return 'Ya hay una contracción en curso. La hemos recuperado del historial.';
    }
    if (error.reason === 'not_allowed') {
      return 'Tu permiso actual no permite registrar contracciones.';
    }
  }
  return 'No pudimos guardar el cambio. Comprueba la conexión e inténtalo de nuevo.';
}

export function PrenatalContractionTracker({
  babyId,
  canManage,
  canRecord,
  contactRepository,
  contractionRepository,
  onOpenContacts,
  userId,
}: PrenatalContractionTrackerProps) {
  const [contractions, setContractions] = useState<Contraction[]>([]);
  const [featuredContacts, setFeaturedContacts] = useState<
    Awaited<ReturnType<BabyContactRepository['loadActive']>>
  >([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      const [loadedContractions, contacts] = await Promise.all([
        contractionRepository.loadRecent(babyId),
        contactRepository.loadActive(babyId),
      ]);
      setContractions(loadedContractions);
      setFeaturedContacts(
        contacts.filter((contact) => contact.isFeatured && contact.phone).slice(0, 3),
      );
      setErrorMessage(undefined);
    } catch {
      setErrorMessage('No pudimos cargar el contador. Comprueba la conexión.');
    }
  }, [babyId, contactRepository, contractionRepository]);

  useEffect(() => {
    void load();
    return contractionRepository.subscribe(babyId, () => void load());
  }, [babyId, contractionRepository, load]);

  const activeContraction = useMemo(
    () => contractions.find((contraction) => !contraction.endedAt),
    [contractions],
  );

  useEffect(() => {
    if (!activeContraction) return;
    const timer = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(timer);
  }, [activeContraction]);

  async function runOperation(operation: () => Promise<void>) {
    setIsSaving(true);
    setErrorMessage(undefined);
    try {
      await operation();
      setNow(new Date());
      await load();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      if (error instanceof ContractionError && error.reason === 'already_active') {
        await load();
      }
    } finally {
      setIsSaving(false);
    }
  }

  function confirmRemoval(contraction: Contraction) {
    Alert.alert(
      'Quitar contracción',
      'Este registro desaparecerá del historial familiar.',
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          onPress: () => void runOperation(() => contractionRepository.remove(contraction.id)),
          style: 'destructive',
          text: 'Quitar',
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Clock3 color={colors.lavender} size={22} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>ANTES DEL NACIMIENTO</Text>
          <Text style={styles.title}>Contador de contracciones</Text>
          <Text style={styles.subtitle}>
            Registra cuándo empieza y termina cada una. El intervalo se calcula de inicio a inicio.
          </Text>
        </View>
      </View>

      <View style={[styles.timerCard, activeContraction && styles.timerCardActive]}>
        <Text style={styles.timerLabel}>
          {activeContraction ? 'Contracción en curso' : 'Lista para registrar'}
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.timerValue}>
          {activeContraction
            ? formatTimer(getContractionDurationSeconds(activeContraction, now))
            : '00:00'}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={!canRecord || isSaving}
          onPress={() =>
            void runOperation(() =>
              activeContraction
                ? contractionRepository.finish(activeContraction.id)
                : contractionRepository.start(babyId).then(() => undefined),
            )
          }
          style={({ pressed }) => [
            styles.timerButton,
            activeContraction && styles.timerButtonStop,
            (!canRecord || isSaving) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {activeContraction ? (
            <Square color={colors.onAccent} fill={colors.onAccent} size={17} />
          ) : (
            <Plus color={colors.onAccent} size={20} />
          )}
          <Text style={styles.timerButtonText}>
            {isSaving
              ? 'Guardando…'
              : activeContraction
                ? 'Terminar contracción'
                : 'Empezar contracción'}
          </Text>
        </Pressable>
        {!canRecord ? (
          <Text style={styles.readOnlyText}>Puedes consultar el historial, pero tu rol es de solo lectura.</Text>
        ) : null}
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.warning}>
        <AlertTriangle color={colors.butter} size={22} />
        <View style={styles.warningCopy}>
          <Text style={styles.warningTitle}>Este contador no sustituye una valoración médica</Text>
          <Text style={styles.warningText}>
            Sigue siempre las indicaciones de tu maternidad. Contacta con urgencias obstétricas si rompes aguas, tienes sangrado, notas menos movimientos del bebé, dolor intenso continuo o crees estar de parto antes de la semana 37.
          </Text>
        </View>
      </View>

      <View style={styles.contactsSection}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Contactos importantes</Text>
          <Pressable onPress={onOpenContacts} style={styles.textLink}>
            <Text style={styles.textLinkLabel}>Gestionar</Text>
          </Pressable>
        </View>
        {featuredContacts.length > 0 ? (
          <View style={styles.contactList}>
            {featuredContacts.map((contact) => (
              <Pressable
                accessibilityHint={`Llama a ${contact.name}`}
                accessibilityRole="button"
                key={contact.id}
                onPress={() => void callBabyContact(contact.phone!)}
                style={({ pressed }) => [styles.contactButton, pressed && styles.buttonPressed]}
              >
                <View style={styles.contactIcon}>
                  <Phone color={colors.primaryPressed} size={18} />
                </View>
                <View style={styles.contactCopy}>
                  <Text numberOfLines={1} style={styles.contactName}>{contact.name}</Text>
                  <Text numberOfLines={1} style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <Text style={styles.callLabel}>Llamar</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            onPress={onOpenContacts}
            style={({ pressed }) => [styles.emptyContacts, pressed && styles.buttonPressed]}
          >
            <Phone color={colors.primaryPressed} size={21} />
            <View style={styles.contactCopy}>
              <Text style={styles.emptyContactsTitle}>Guarda un contacto para tenerlo a mano</Text>
              <Text style={styles.emptyContactsText}>
                Marca como importante tu maternidad, matrona o contacto de urgencias.
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Histórico reciente</Text>
        {contractions.length === 0 ? (
          <Text style={styles.emptyHistory}>Las contracciones terminadas aparecerán aquí.</Text>
        ) : (
          contractions.map((contraction, index) => {
            const canRemove = contraction.recordedBy === userId || canManage;
            const previous = contractions[index + 1];
            return (
              <View key={contraction.id} style={styles.historyRow}>
                <View style={styles.historyTime}>
                  <Text style={styles.historyStarted}>{formatTime(contraction.startedAt)}</Text>
                  <Text style={styles.historyDate}>
                    {new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short' }).format(new Date(contraction.startedAt))}
                  </Text>
                </View>
                <View style={styles.historyCopy}>
                  <Text style={styles.historyDuration}>
                    {contraction.endedAt
                      ? `Duró ${formatTimer(getContractionDurationSeconds(contraction, now))}`
                      : 'En curso'}
                  </Text>
                  <Text style={styles.historyInterval}>
                    {formatContractionInterval(
                      getContractionIntervalSeconds(contraction, previous),
                    )}
                  </Text>
                </View>
                {canRemove ? (
                  <Pressable
                    accessibilityLabel="Quitar contracción"
                    hitSlop={8}
                    onPress={() => confirmRemoval(contraction)}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.buttonPressed]}
                  >
                    <Trash2 color={colors.error} size={17} />
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = createThemedStyleSheet((palette) => ({
  container: { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.xl, padding: spacing.xl },
  heading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  headingIcon: { alignItems: 'center', backgroundColor: palette.lavenderSoft, borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: palette.lavender, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: palette.text, fontSize: 22, fontWeight: '900', marginTop: 2 },
  subtitle: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  timerCard: { alignItems: 'center', backgroundColor: palette.surfaceMuted, borderColor: palette.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.xl },
  timerCardActive: { backgroundColor: palette.lavenderSoft, borderColor: palette.lavender },
  timerLabel: { color: palette.textMuted, fontSize: 13, fontWeight: '800' },
  timerValue: { color: palette.text, fontSize: 48, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: 1 },
  timerButton: { alignItems: 'center', backgroundColor: palette.primary, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.xl },
  timerButtonStop: { backgroundColor: palette.coral },
  timerButtonText: { color: palette.onAccent, fontSize: 15, fontWeight: '900' },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  readOnlyText: { color: palette.textMuted, fontSize: 12, textAlign: 'center' },
  errorText: { backgroundColor: palette.errorSoft, borderRadius: radius.md, color: palette.error, fontSize: 13, fontWeight: '700', padding: spacing.md },
  warning: { alignItems: 'flex-start', backgroundColor: palette.butterSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  warningCopy: { flex: 1, minWidth: 0 },
  warningTitle: { color: palette.text, fontSize: 14, fontWeight: '900' },
  warningText: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  contactsSection: { gap: spacing.md },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  sectionTitle: { color: palette.text, fontSize: 17, fontWeight: '900' },
  textLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  textLinkLabel: { color: palette.primaryPressed, fontSize: 13, fontWeight: '900' },
  contactList: { gap: spacing.sm },
  contactButton: { alignItems: 'center', backgroundColor: palette.surfaceMuted, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, minHeight: 58, padding: spacing.md },
  contactIcon: { alignItems: 'center', backgroundColor: palette.aquaSoft, borderRadius: 999, height: 38, justifyContent: 'center', width: 38 },
  contactCopy: { flex: 1, minWidth: 0 },
  contactName: { color: palette.text, fontSize: 14, fontWeight: '900' },
  contactPhone: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
  callLabel: { color: palette.primaryPressed, fontSize: 13, fontWeight: '900' },
  emptyContacts: { alignItems: 'center', backgroundColor: palette.aquaSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, minHeight: 68, padding: spacing.lg },
  emptyContactsTitle: { color: palette.text, fontSize: 14, fontWeight: '900' },
  emptyContactsText: { color: palette.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  historySection: { gap: spacing.sm },
  emptyHistory: { color: palette.textMuted, fontSize: 13, paddingVertical: spacing.sm },
  historyRow: { alignItems: 'center', borderColor: palette.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 64, paddingVertical: spacing.md },
  historyTime: { width: 62 },
  historyStarted: { color: palette.text, fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '900' },
  historyDate: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
  historyCopy: { flex: 1, minWidth: 0 },
  historyDuration: { color: palette.text, fontSize: 13, fontWeight: '800' },
  historyInterval: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
  removeButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
}));
