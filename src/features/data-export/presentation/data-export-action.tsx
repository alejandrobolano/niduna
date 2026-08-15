import { Download } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type {
  DataExportRepository,
  DataExportScope,
} from '@/features/data-export/application/data-export-repository';
import { savePortableDataExport } from '@/features/data-export/infrastructure/portable-export-file';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface DataExportActionProps {
  description: string;
  label: string;
  repository: DataExportRepository;
  scope: DataExportScope;
}

export function DataExportAction({
  description,
  label,
  repository,
  scope,
}: DataExportActionProps) {
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function exportData() {
    setError(undefined);
    setIsPending(true);

    try {
      await savePortableDataExport(await repository.create(scope));
    } catch {
      setError('No pudimos preparar la copia. Inténtalo de nuevo.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        disabled={isPending}
        onPress={() => void exportData()}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <View style={styles.icon}>
          <Download color={colors.primaryPressed} size={18} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>{isPending ? 'Preparando copia…' : label}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  root: { gap: spacing.xs },
  action: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: { flex: 1 },
  label: { color: colors.text, fontSize: 14, fontWeight: '900' },
  description: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  error: { color: colors.error, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
}));
