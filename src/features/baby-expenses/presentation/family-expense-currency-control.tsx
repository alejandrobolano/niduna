import { LockKeyhole } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { BabyExpenseRepository } from '@/features/baby-expenses/application/baby-expense-repository';
import { SelectField, type SelectOption } from '@/features/baby-profile/presentation/select-field';
import type { FamilyRole } from '@/features/family/domain/family';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const currencyOptions = [
  { label: 'Euro (EUR)', value: 'EUR' },
  { label: 'Dólar estadounidense (USD)', value: 'USD' },
  { label: 'Libra esterlina (GBP)', value: 'GBP' },
  { label: 'Dólar canadiense (CAD)', value: 'CAD' },
  { label: 'Peso mexicano (MXN)', value: 'MXN' },
  { label: 'Peso cubano (CUP)', value: 'CUP' },
] satisfies SelectOption<string>[];

interface FamilyExpenseCurrencyControlProps {
  familyId: string;
  familyName: string;
  familyRole: FamilyRole;
  repository: BabyExpenseRepository;
}

export function FamilyExpenseCurrencyControl({
  familyId,
  familyName,
  familyRole,
  repository,
}: FamilyExpenseCurrencyControlProps) {
  const [currency, setCurrency] = useState<string>();
  const [isLocked, setIsLocked] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const canChange = familyRole === 'owner' || familyRole === 'admin';

  useEffect(() => {
    let active = true;
    void Promise.all([
      repository.loadCurrency(familyId),
      repository.isCurrencyLocked(familyId),
    ])
      .then(([nextCurrency, nextLocked]) => {
        if (!active) return;
        setCurrency(nextCurrency);
        setIsLocked(nextLocked);
      })
      .catch(() => {
        if (active) setError('No pudimos cargar la moneda de esta familia.');
      });
    return () => { active = false; };
  }, [familyId, repository]);

  async function changeCurrency(nextCurrency: string) {
    const previousCurrency = currency;
    setCurrency(nextCurrency);
    setIsSaving(true);
    setError(undefined);
    try {
      await repository.setCurrency(familyId, nextCurrency);
    } catch {
      setCurrency(previousCurrency);
      setError('No pudimos guardar la moneda. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>Moneda de los gastos</Text>
        <Text style={styles.description}>
          Se aplica a toda {familyName}. Para evitar mezclar importes, no puede cambiarse después del primer gasto.
        </Text>
      </View>
      {currency && isLocked ? (
        <View style={styles.lockedValue}>
          <View style={styles.lockedIcon}>
            <LockKeyhole color={colors.primaryPressed} size={18} />
          </View>
          <View style={styles.lockedCopy}>
            <Text style={styles.lockedLabel}>Moneda actual</Text>
            <Text style={styles.lockedCurrency}>
              {currencyOptions.find((option) => option.value === currency)?.label ?? currency}
            </Text>
          </View>
        </View>
      ) : currency ? (
        <SelectField
          disabled={!canChange || isSaving}
          label="Moneda"
          onChange={(value) => void changeCurrency(value)}
          options={currencyOptions}
          placeholder="Selecciona una moneda"
          title="Moneda de los gastos"
          value={currency}
        />
      ) : error ? null : (
        <ActivityIndicator color={colors.primaryPressed} />
      )}
      {isLocked ? (
        <Text style={styles.hint}>
          La moneda queda protegida después del primer gasto para que los totales no mezclen importes de monedas diferentes.
        </Text>
      ) : !canChange ? (
        <Text style={styles.hint}>Solo propietarios y administradores pueden cambiarla.</Text>
      ) : null}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: { gap: spacing.md },
  copy: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  description: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  hint: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  error: { color: colors.error, fontSize: 11, lineHeight: 16 },
  lockedValue: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.md,
  },
  lockedIcon: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  lockedCopy: { flex: 1, gap: 2 },
  lockedLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  lockedCurrency: { color: colors.text, fontSize: 15, fontWeight: '800' },
}));
