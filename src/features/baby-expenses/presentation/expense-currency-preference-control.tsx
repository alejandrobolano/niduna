import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ExpenseCurrency } from '@/features/baby-expenses/domain/expense-currency';
import { useExpenseCurrencyPreference } from '@/features/baby-expenses/presentation/expense-currency-preference-provider';
import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const options: { label: string; value: ExpenseCurrency }[] = [
  { label: 'EUR', value: 'EUR' },
  { label: 'USD', value: 'USD' },
  { label: 'GBP', value: 'GBP' },
  { label: 'CAD', value: 'CAD' },
  { label: 'MXN', value: 'MXN' },
  { label: 'CUP', value: 'CUP' },
];

export function ExpenseCurrencyPreferenceControl() {
  const { currency, isSaving, setCurrency } = useExpenseCurrencyPreference();
  const [error, setError] = useState<string>();

  async function selectCurrency(nextCurrency: ExpenseCurrency) {
    setError(undefined);
    try {
      await setCurrency(nextCurrency);
    } catch {
      setError('No pudimos guardar la moneda. Inténtalo de nuevo.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>Moneda de los gastos</Text>
        <Text style={styles.description}>
          Elige cómo quieres ver los importes en este perfil. Solo cambia el código y el símbolo mostrados; no convierte las cantidades.
        </Text>
      </View>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => {
          const selected = option.value === currency;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: isSaving }}
              disabled={isSaving}
              key={option.value}
              onPress={() => void selectCurrency(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: { gap: spacing.md },
  copy: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  description: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  error: { color: colors.error, fontSize: 11, lineHeight: 16 },
  options: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 76,
    paddingHorizontal: spacing.md,
  },
  optionSelected: { backgroundColor: colors.aqua },
  optionText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  optionTextSelected: { color: colors.text },
  pressed: { opacity: 0.75 },
}));
