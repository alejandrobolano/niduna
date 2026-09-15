import { useEffect, useState } from 'react';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { resolveBabyAvatar } from '@/features/avatars/domain/avatar';
import { AnimalAvatar } from '@/features/avatars/presentation/animal-avatar';
import { supabaseAuthService } from '@/features/auth/infrastructure/supabase-auth-service';
import { supabaseCareRepository } from '@/features/care/infrastructure/supabase-care-repository';
import { createCareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';
import {
  bindCareWidgetToBaby,
  loadCareWidgetBabyId,
  saveCareWidgetSnapshot,
} from '@/features/care-widget/infrastructure/care-widget-storage';
import { createCareWidgetRepresentation } from '@/features/care-widget/presentation/care-widget-view.android';
import type { FamilyBabyGroup, FamilyBabySummary } from '@/features/family/domain/family-baby-context';
import { supabaseFamilyBabyContextRepository } from '@/features/family/infrastructure/supabase-family-baby-context-repository';
import { canAccessCare } from '@/features/home/domain/app-section-access';
import { colors, radius, spacing } from '@/shared/presentation/theme';

type Status = 'loading' | 'ready' | 'saving' | 'error';

export function CareWidgetConfigurationScreen({
  renderWidget,
  setResult,
  widgetInfo,
}: WidgetConfigurationScreenProps) {
  const [families, setFamilies] = useState<FamilyBabyGroup[]>([]);
  const [selectedBabyId, setSelectedBabyId] = useState<string>();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let active = true;

    void Promise.all([
      supabaseAuthService.getSession(),
      loadCareWidgetBabyId(widgetInfo.widgetId),
    ])
      .then(async ([session, configuredBabyId]) => {
        if (!session) throw new Error('missing_session');
        const loaded = await supabaseFamilyBabyContextRepository.load(session.user.id);
        if (!active) return;
        setFamilies(loaded);
        setSelectedBabyId(configuredBabyId);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));

    return () => {
      active = false;
    };
  }, [widgetInfo.widgetId]);

  async function selectBaby(baby: FamilyBabySummary) {
    if (status === 'saving') return;
    setSelectedBabyId(baby.id);
    setStatus('saving');

    try {
      const session = await supabaseAuthService.getSession();
      if (!session) throw new Error('missing_session');
      const dashboard = await supabaseCareRepository.load(session.user.id, baby.id);
      if (!dashboard) throw new Error('missing_baby');

      const snapshot = createCareWidgetSnapshot(dashboard);
      await bindCareWidgetToBaby(widgetInfo.widgetId, baby.id);
      await saveCareWidgetSnapshot(snapshot);
      renderWidget(createCareWidgetRepresentation(snapshot));
      setResult('ok');
    } catch {
      setStatus('error');
    }
  }

  const availableFamilies = families
    .map((family) => ({
      ...family,
      babies: family.babies.filter((baby) => canAccessCare(baby.lifeStage)),
    }))
    .filter((family) => family.babies.length > 0);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>WIDGET DE RELEVO</Text>
        <Text style={styles.title}>¿Qué bebé quieres mostrar?</Text>
        <Text style={styles.subtitle}>
          Puedes añadir otro widget y elegir un bebé diferente.
        </Text>
      </View>

      {status === 'loading' ? (
        <Message loading text="Preparando tus bebés…" />
      ) : status === 'error' ? (
        <Message
          action={() => setResult('cancel')}
          text="Abre Niduna, comprueba tu sesión y vuelve a intentarlo."
          title="No pudimos preparar el widget"
        />
      ) : availableFamilies.length === 0 ? (
        <Message
          action={() => setResult('cancel')}
          text="El widget se puede usar con bebés que ya hayan nacido."
          title="Todavía no hay bebés disponibles"
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {availableFamilies.map((family) => (
            <View key={family.id} style={styles.group}>
              <Text style={styles.familyName}>{family.name}</Text>
              {family.babies.map((baby) => {
                const selected = selectedBabyId === baby.id;
                return (
                  <Pressable
                    disabled={status === 'saving'}
                    key={baby.id}
                    onPress={() => void selectBaby(baby)}
                    style={[styles.card, selected && styles.selectedCard]}
                  >
                    <AnimalAvatar
                      accessibilityLabel={`Avatar de ${baby.name}`}
                      photoUrl={baby.photoUrl}
                      size={52}
                      variant={resolveBabyAvatar(baby.avatarKey, baby.sexAtBirth)}
                    />
                    <View style={styles.copy}>
                      <Text style={styles.babyName}>{baby.name}</Text>
                      <Text style={styles.hint}>Alimentación, pañal y sueño</Text>
                    </View>
                    <View style={[styles.mark, selected && styles.selectedMark]}>
                      {status === 'saving' && selected ? (
                        <ActivityIndicator color={colors.onAccent} />
                      ) : selected ? (
                        <Text style={styles.check}>✓</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Message({
  action,
  loading,
  text,
  title,
}: {
  action?: () => void;
  loading?: boolean;
  text: string;
  title?: string;
}) {
  return (
    <View style={styles.messageBox}>
      {loading ? <ActivityIndicator color={colors.aqua} size="large" /> : null}
      {title ? <Text style={styles.messageTitle}>{title}</Text> : null}
      <Text style={styles.message}>{text}</Text>
      {action ? (
        <Pressable onPress={action} style={styles.closeButton}>
          <Text style={styles.closeText}>Cerrar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  babyName: { color: colors.text, fontSize: 19, fontWeight: '700' },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', padding: spacing.lg },
  check: { color: colors.onAccent, fontSize: 18, fontWeight: '900' },
  closeButton: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, marginTop: spacing.xl, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  closeText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  copy: { flex: 1, marginHorizontal: spacing.md },
  eyebrow: { color: colors.coral, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  familyName: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  group: { gap: spacing.md },
  header: { padding: spacing.xl, paddingBottom: spacing.md },
  hint: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  list: { gap: spacing.xl, padding: spacing.xl },
  mark: { alignItems: 'center', borderColor: colors.border, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
  message: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm, textAlign: 'center' },
  messageBox: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xl },
  messageTitle: { color: colors.text, fontSize: 21, fontWeight: '800', textAlign: 'center' },
  screen: { backgroundColor: colors.background, flex: 1 },
  selectedCard: { borderColor: colors.aqua, borderWidth: 2 },
  selectedMark: { backgroundColor: colors.aqua },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: spacing.xs },
});
