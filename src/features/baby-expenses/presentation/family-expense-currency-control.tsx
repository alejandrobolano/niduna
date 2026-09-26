import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { BabyExpenseRepository } from '@/features/baby-expenses/application/baby-expense-repository';
import { SelectField, type SelectOption } from '@/features/baby-profile/presentation/select-field';
import type { FamilyRole } from '@/features/family/domain/family';
import { colors, createThemedStyleSheet, spacing } from '@/shared/presentation/theme';

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
      {currency ? (
        <SelectField
          disabled={!canChange || isLocked || isSaving}
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
        <Text style={styles.hint}>Configuración bloqueada porque la familia ya tiene gastos.</Text>
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
}));
