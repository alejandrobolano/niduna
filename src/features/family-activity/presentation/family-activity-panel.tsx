import { ChevronDown, ChevronUp, History, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { describeFamilyAuditEntry } from '@/features/family-activity/application/describe-family-audit-entry';
import type { FamilyAuditRepository } from '@/features/family-activity/application/family-audit-repository';
import type { FamilyAuditEntry } from '@/features/family-activity/domain/family-audit-entry';
import { colors, radius, spacing } from '@/shared/presentation/theme';

interface FamilyActivityPanelProps {
  familyId: string;
  repository: FamilyAuditRepository;
}

export function FamilyActivityPanel({
  familyId,
  repository,
}: FamilyActivityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [entries, setEntries] = useState<FamilyAuditEntry[]>([]);

  async function load() {
    setIsLoading(true);
    setHasError(false);

    try {
      setEntries(await repository.loadRecent(familyId));
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function toggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && entries.length === 0) {
      void load();
    }
  }

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={toggle}
        style={styles.heading}
      >
        <View style={styles.icon}>
          <History color={colors.primaryPressed} size={19} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Actividad familiar</Text>
          <Text style={styles.subtitle}>Visible para propietarios y administradores</Text>
        </View>
        {isOpen ? (
          <ChevronUp color={colors.textMuted} size={18} />
        ) : (
          <ChevronDown color={colors.textMuted} size={18} />
        )}
      </Pressable>

      {isOpen ? (
        <View style={styles.content}>
          <View style={styles.contentHeading}>
            <Text style={styles.retention}>Se conserva durante 90 días</Text>
            <Pressable
              accessibilityLabel="Actualizar actividad"
              disabled={isLoading}
              onPress={() => void load()}
              style={styles.refresh}
            >
              <RefreshCw color={colors.primaryPressed} size={15} />
            </Pressable>
          </View>
          {hasError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              No pudimos cargar la actividad.
            </Text>
          ) : isLoading ? (
            <Text style={styles.empty}>Cargando actividad…</Text>
          ) : entries.length > 0 ? (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Text style={styles.entryText}>
                  {describeFamilyAuditEntry(entry)}
                </Text>
                <Text style={styles.entryDate}>
                  {new Intl.DateTimeFormat('es-ES', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(entry.createdAt))}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>Todavía no hay actividad registrada.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  content: { gap: spacing.sm, marginTop: spacing.lg },
  contentHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  retention: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  refresh: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  entry: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  entryText: { color: colors.text, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  entryDate: { color: colors.textMuted, fontSize: 10 },
  empty: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  error: { color: colors.error, fontSize: 12 },
});
