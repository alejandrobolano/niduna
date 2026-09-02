import {
  CheckSquare2,
  FileText,
  Square,
  Users,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BabyContact } from '@/features/baby-contacts/domain/baby-contact';
import {
  careReportColumns,
  type CareReportColumn,
} from '@/features/care/application/care-report';
import type { CareEvent } from '@/features/care/domain/care-event';
import {
  colors,
  createThemedStyleSheet,
  radius,
  spacing,
} from '@/shared/presentation/theme';

export interface CareReportSelection {
  columns: CareReportColumn[];
  contacts: BabyContact[];
}

interface CareReportModalProps {
  contacts: BabyContact[];
  events: CareEvent[];
  filterLabel: string;
  isGenerating: boolean;
  isLoading: boolean;
  onClose: () => void;
  onGenerate: (selection: CareReportSelection) => void;
  visible: boolean;
}

export function CareReportModal({
  contacts,
  events,
  filterLabel,
  isGenerating,
  isLoading,
  onClose,
  onGenerate,
  visible,
}: CareReportModalProps) {
  const [columns, setColumns] = useState<Set<CareReportColumn>>(
    () => new Set(careReportColumns.map((column) => column.value)),
  );
  const [contactIds, setContactIds] = useState<Set<string>>(
    () => new Set(contacts.filter((contact) => contact.isFeatured).map((contact) => contact.id)),
  );

  function toggleColumn(column: CareReportColumn) {
    setColumns((current) => {
      const next = new Set(current);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  }

  function toggleContact(contactId: string) {
    setContactIds((current) => {
      const next = new Set(current);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  function generate() {
    onGenerate({
      columns: careReportColumns
        .map((column) => column.value)
        .filter((column) => columns.has(column)),
      contacts: contacts.filter((contact) => contactIds.has(contact.id)),
    });
  }

  const close = () => {
    if (!isGenerating) onClose();
  };
  const disabled = isGenerating || isLoading || events.length === 0 || columns.size === 0;

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaView style={styles.root}>
        <Pressable
          accessibilityLabel="Cerrar configuración del informe"
          disabled={isGenerating}
          onPress={close}
          style={styles.backdrop}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>EXPORTAR PDF</Text>
              <Text style={styles.title}>Informe personalizado</Text>
              <Text style={styles.subtitle}>
                Elige qué información acompañará a la tabla de registros.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar"
              disabled={isGenerating}
              onPress={close}
              style={styles.close}
            >
              <X color={colors.text} size={22} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.scopeCard}>
              <View style={styles.scopeIcon}>
                <FileText color={colors.primaryPressed} size={21} />
              </View>
              <View style={styles.scopeCopy}>
                <Text style={styles.scopeTitle}>
                  {isLoading ? 'Preparando registros…' : `${events.length} registros`}
                </Text>
                <Text style={styles.scopeText}>{filterLabel}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Columnas de la tabla</Text>
              <Text style={styles.sectionHint}>Todas aparecen seleccionadas inicialmente.</Text>
              <View style={styles.options}>
                {careReportColumns.map((column) => {
                  const selected = columns.has(column.value);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      key={column.value}
                      onPress={() => toggleColumn(column.value)}
                      style={({ pressed }) => [
                        styles.option,
                        selected && styles.optionSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      {selected ? (
                        <CheckSquare2 color={colors.primaryPressed} size={19} />
                      ) : (
                        <Square color={colors.textMuted} size={19} />
                      )}
                      <Text style={styles.optionText}>{column.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {columns.size === 0 ? (
                <Text accessibilityRole="alert" style={styles.warning}>
                  Selecciona al menos una columna.
                </Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>Contactos del bebé</Text>
                  <Text style={styles.sectionHint}>Opcional. Los destacados se marcan por defecto.</Text>
                </View>
                <View style={styles.contactCount}>
                  <Users color={colors.primaryPressed} size={16} />
                  <Text style={styles.contactCountText}>{contactIds.size}</Text>
                </View>
              </View>
              {contacts.length === 0 ? (
                <Text style={styles.emptyContacts}>No hay contactos activos para incluir.</Text>
              ) : (
                <View style={styles.contactOptions}>
                  {contacts.map((contact) => {
                    const selected = contactIds.has(contact.id);
                    return (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        key={contact.id}
                        onPress={() => toggleContact(contact.id)}
                        style={({ pressed }) => [
                          styles.contactOption,
                          selected && styles.contactOptionSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        {selected ? (
                          <CheckSquare2 color={colors.primaryPressed} size={19} />
                        ) : (
                          <Square color={colors.textMuted} size={19} />
                        )}
                        <View style={styles.contactCopy}>
                          <Text style={styles.contactName}>{contact.name}</Text>
                          <Text style={styles.contactDetail} numberOfLines={1}>
                            {[contact.contactPerson, contact.phone].filter(Boolean).join(' · ') || 'Sin teléfono indicado'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isGenerating}
              onPress={close}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={generate}
              style={({ pressed }) => [
                styles.generateButton,
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              {isGenerating ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <>
                  <FileText color={colors.onAccent} size={18} />
                  <Text style={styles.generateText}>Generar PDF</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  root: {
    backgroundColor: 'rgba(24, 35, 75, 0.58)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '92%',
    maxWidth: 720,
    overflow: 'hidden',
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 5,
    marginTop: spacing.sm,
    width: 72,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headingCopy: { flex: 1 },
  eyebrow: { color: colors.coralPressed, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  close: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  scopeCard: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  scopeIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  scopeCopy: { flex: 1 },
  scopeTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  scopeText: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  section: { gap: spacing.sm },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  sectionHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  optionSelected: { backgroundColor: colors.aquaSoft, borderColor: colors.aqua },
  optionText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  warning: { color: colors.error, fontSize: 12 },
  contactCount: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  contactCountText: { color: colors.primaryPressed, fontSize: 12, fontWeight: '900' },
  contactOptions: { gap: spacing.sm, marginTop: spacing.xs },
  contactOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  contactOptionSelected: { backgroundColor: colors.aquaSoft, borderColor: colors.aqua },
  contactCopy: { flex: 1 },
  contactName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  contactDetail: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  emptyContacts: { color: colors.textMuted, fontSize: 12, paddingVertical: spacing.sm },
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  generateButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryPressed,
    borderRadius: radius.md,
    flex: 1.4,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
  },
  generateText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
}));
