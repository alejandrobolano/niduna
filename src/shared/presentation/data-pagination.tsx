import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { CareHistoryPageSize } from '@/features/care/application/care-history';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const pageSizes = [20, 50, 100] as const;

interface DataPaginationProps {
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: CareHistoryPageSize) => void;
  page: number;
  pageSize: CareHistoryPageSize;
  total: number;
  totalPages: number;
}

export function DataPagination({
  onChangePage,
  onChangePageSize,
  page,
  pageSize,
  total,
  totalPages,
}: DataPaginationProps) {
  return (
    <View style={styles.container}>
      <View style={styles.sizes}>
        <Text style={styles.caption}>Filas</Text>
        {pageSizes.map((size) => {
          const selected = size === pageSize;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={size}
              onPress={() => onChangePageSize(size)}
              style={[styles.size, selected && styles.sizeSelected]}
            >
              <Text style={[styles.sizeText, selected && styles.sizeTextSelected]}>
                {size}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.navigation}>
        <Text style={styles.caption}>{total} registros</Text>
        <Pressable
          accessibilityLabel="Página anterior"
          disabled={page <= 1}
          onPress={() => onChangePage(page - 1)}
          style={[styles.button, page <= 1 && styles.disabled]}
        >
          <ChevronLeft color={colors.text} size={18} />
        </Pressable>
        <Text style={styles.page}>{page} de {totalPages}</Text>
        <Pressable
          accessibilityLabel="Página siguiente"
          disabled={page >= totalPages}
          onPress={() => onChangePage(page + 1)}
          style={[styles.button, page >= totalPages && styles.disabled]}
        >
          <ChevronRight color={colors.text} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  sizes: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  navigation: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  caption: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  size: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
  },
  sizeSelected: { backgroundColor: colors.text },
  sizeText: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  sizeTextSelected: { color: colors.onAccent },
  button: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  disabled: { opacity: 0.4 },
  page: { color: colors.text, fontSize: 11, fontWeight: '900' },
}));
