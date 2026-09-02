import {
  Archive,
  Clipboard,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  UserPlus,
  UsersRound,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canManageBabyContact } from '@/features/baby-contacts/application/baby-contact-permissions';
import {
  BabyContactError,
  type BabyContactDraft,
  type BabyContactPage,
  type BabyContactPageSize,
  type BabyContactRepository,
} from '@/features/baby-contacts/application/baby-contact-repository';
import {
  validateBabyContact,
  type BabyContactField,
} from '@/features/baby-contacts/application/validate-baby-contact';
import type { BabyContact, BabyContactCategory } from '@/features/baby-contacts/domain/baby-contact';
import {
  callBabyContact,
  copyBabyContactValue,
  openBabyContactAddress,
  openBabyContactWebsite,
  saveBabyContactToDevice,
  type BabyContactMapTarget,
} from '@/features/baby-contacts/infrastructure/baby-contact-actions';
import { BabyContactQrModal } from '@/features/baby-contacts/presentation/baby-contact-qr-modal';
import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import { SelectField, type SelectOption } from '@/features/baby-profile/presentation/select-field';
import type { FamilyRole } from '@/features/family/domain/family';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { DataPagination } from '@/shared/presentation/data-pagination';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const categoryOptions = [
  { label: 'Salud', value: 'health' },
  { label: 'Nutrición', value: 'nutrition' },
  { label: 'Educación', value: 'education' },
  { label: 'Actividad', value: 'activity' },
  { label: 'Emergencia', value: 'emergency' },
  { label: 'Otra', value: 'other' },
] satisfies SelectOption<BabyContactCategory>[];

const categoryLabels = Object.fromEntries(
  categoryOptions.map(({ label, value }) => [value, label]),
) as Record<BabyContactCategory, string>;

const emptyDraft: BabyContactDraft = {
  category: 'health',
  isFeatured: false,
  name: '',
};

interface BabyContactsScreenProps {
  babyId: string;
  babyName: string;
  familyName: string;
  familyRole: FamilyRole;
  onBack: () => void;
  repository: BabyContactRepository;
  topContent?: ReactNode;
  userId: string;
}

function errorMessage(error: unknown): string {
  if (error instanceof BabyContactError && error.reason === 'invalid') {
    return 'Revisa los datos del contacto.';
  }
  if (error instanceof BabyContactError && error.reason === 'not_allowed') {
    return 'No tienes permiso para realizar este cambio.';
  }
  return 'No pudimos completar la acción. Comprueba la conexión e inténtalo de nuevo.';
}

export function BabyContactsScreen({
  babyId,
  babyName,
  familyName,
  familyRole,
  onBack,
  repository,
  topContent,
  userId,
}: BabyContactsScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [result, setResult] = useState<BabyContactPage>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<BabyContactPageSize>(20);
  const [category, setCategory] = useState<BabyContactCategory | 'all'>('all');
  const [retired, setRetired] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState<BabyContactDraft>(emptyDraft);
  const [editing, setEditing] = useState<BabyContact>();
  const [showForm, setShowForm] = useState(false);
  const [confirming, setConfirming] = useState<BabyContact>();
  const [validation, setValidation] = useState<Partial<Record<BabyContactField, string>>>({});
  const [copied, setCopied] = useState<string>();
  const [mapAddress, setMapAddress] = useState<string>();
  const [qrContact, setQrContact] = useState<BabyContact>();

  useEffect(() => {
    let active = true;
    void repository
      .loadPage(babyId, page, pageSize, {
        category: category === 'all' ? undefined : category,
        retired,
        search: search || undefined,
      })
      .then((nextResult) => {
        if (!active) return;
        if (page > nextResult.totalPages) {
          setPage(nextResult.totalPages);
          return;
        }
        setResult(nextResult);
      })
      .catch((reason) => active && setError(errorMessage(reason)))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [babyId, category, page, pageSize, reloadVersion, repository, retired, search]);

  const contacts = result?.contacts ?? [];
  const title = retired ? 'Contactos retirados' : 'Directorio de la familia';

  function updateDraft<K extends keyof BabyContactDraft>(key: K, value: BabyContactDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setValidation((current) => ({ ...current, [key]: undefined }));
  }

  function resetForm() {
    setDraft(emptyDraft);
    setEditing(undefined);
    setShowForm(false);
    setValidation({});
  }

  function beginEdit(contact: BabyContact) {
    setDraft({
      address: contact.address,
      category: contact.category,
      contactPerson: contact.contactPerson,
      isFeatured: contact.isFeatured,
      name: contact.name,
      notes: contact.notes,
      phone: contact.phone,
      websiteUrl: contact.websiteUrl,
    });
    setEditing(contact);
    setShowForm(true);
    setValidation({});
  }

  async function save() {
    const errors = validateBabyContact(draft);
    if (errors.length) {
      setValidation(Object.fromEntries(errors.map((item) => [item.field, item.message])));
      return;
    }
    setIsSaving(true);
    setError(undefined);
    try {
      await repository.save(babyId, draft, editing?.id);
      resetForm();
      setPage(1);
      setReloadVersion((value) => value + 1);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setIsSaving(false);
    }
  }

  async function changeRetirement() {
    if (!confirming) return;
    setIsSaving(true);
    try {
      await repository.setRetired(confirming.id, !confirming.retiredAt);
      setConfirming(undefined);
      setReloadVersion((value) => value + 1);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setIsSaving(false);
    }
  }

  async function runAction(action: () => Promise<void>, success?: string) {
    try {
      setError(undefined);
      await action();
      if (success) {
        setCopied(success);
        setTimeout(() => setCopied(undefined), 1800);
      }
    } catch {
      setError('No pudimos abrir o copiar este dato en el dispositivo.');
    }
  }

  function openAddress(address: string) {
    if (Platform.OS === 'web') {
      void runAction(() => openBabyContactAddress(address));
      return;
    }
    setMapAddress(address);
  }

  function openAddressWith(target: BabyContactMapTarget) {
    if (!mapAddress) return;
    const address = mapAddress;
    setMapAddress(undefined);
    void runAction(() => openBabyContactAddress(address, target));
  }

  async function saveContact(contact: BabyContact) {
    try {
      setError(undefined);
      const saved = await saveBabyContactToDevice(contact);
      if (saved) {
        setCopied(Platform.OS === 'web' ? 'Archivo de contacto descargado' : 'Contacto guardado');
        setTimeout(() => setCopied(undefined), 1800);
      }
    } catch {
      setError('No pudimos preparar este contacto en el dispositivo.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {topContent}
          <View style={[styles.hero, compact && styles.heroCompact]}>
            <View style={styles.heroIcon}><UsersRound color={colors.aqua} size={30} /></View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>CONTACTOS IMPORTANTES</Text>
              <Text style={styles.title}>Directorio de {babyName}</Text>
              <Text style={styles.subtitle}>{familyName} puede encontrar aquí personas y lugares útiles.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>Volver al bebé</Text>
            </Pressable>
          </View>

          {!retired ? (
            <View style={styles.createArea}>
              <View>
                <Text style={styles.sectionTitle}>Información compartida</Text>
                <Text style={styles.sectionHint}>No sustituye a los servicios de emergencia de tu zona.</Text>
              </View>
              <Pressable onPress={() => { setEditing(undefined); setDraft(emptyDraft); setShowForm(true); }} style={styles.addButton}>
                <Plus color={colors.onAccent} size={18} />
                <Text style={styles.addButtonText}>Añadir contacto</Text>
              </Pressable>
            </View>
          ) : null}

          {showForm && !retired ? (
            <View style={styles.formCard}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>{editing ? 'Editar contacto' : 'Nuevo contacto'}</Text>
                  <Text style={styles.sectionHint}>Nombre y al menos un dato útil son obligatorios.</Text>
                </View>
                <Pressable onPress={resetForm}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
              </View>
              <View style={[styles.formRow, compact && styles.formRowCompact]}>
                <ProfileField autoCapitalize="words" error={validation.name} label="Nombre" maxLength={120} onChangeText={(value) => updateDraft('name', value)} placeholder="Ej. Pediatra, hospital o farmacia" value={draft.name} />
                <SelectField label="Categoría" onChange={(value) => updateDraft('category', value)} options={categoryOptions} placeholder="Seleccionar" title="Categoría del contacto" value={draft.category} />
              </View>
              <View style={[styles.formRow, compact && styles.formRowCompact]}>
                <ProfileField autoCapitalize="words" label="Persona de contacto" maxLength={120} onChangeText={(value) => updateDraft('contactPerson', value)} placeholder="Opcional" value={draft.contactPerson ?? ''} />
                <ProfileField error={validation.phone} keyboardType="phone-pad" label="Teléfono" maxLength={40} onChangeText={(value) => updateDraft('phone', value)} placeholder="Opcional" value={draft.phone ?? ''} />
              </View>
              <View style={[styles.formRow, compact && styles.formRowCompact]}>
                <ProfileField error={validation.address} label="Dirección" maxLength={300} onChangeText={(value) => updateDraft('address', value)} placeholder="Opcional" value={draft.address ?? ''} />
                <ProfileField autoCapitalize="none" autoCorrect={false} error={validation.websiteUrl} keyboardType="url" label="Sitio web" maxLength={500} onChangeText={(value) => updateDraft('websiteUrl', value)} placeholder="ejemplo.com" value={draft.websiteUrl ?? ''} />
              </View>
              <ProfileField error={validation.notes} label="Notas breves" maxLength={500} multiline onChangeText={(value) => updateDraft('notes', value)} placeholder="Horario, indicaciones u otra información útil" style={styles.notesInput} value={draft.notes ?? ''} />
              <View style={styles.featuredRow}>
                <View><Text style={styles.featuredTitle}>Contacto destacado</Text><Text style={styles.sectionHint}>Aparecerá antes que el resto.</Text></View>
                <Switch onValueChange={(value) => updateDraft('isFeatured', value)} trackColor={{ false: colors.border, true: colors.aqua }} value={draft.isFeatured} />
              </View>
              <Pressable disabled={isSaving} onPress={() => void save()} style={[styles.primaryButton, isSaving && styles.disabled]}>
                {isSaving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryButtonText}>{editing ? 'Guardar cambios' : 'Guardar contacto'}</Text>}
              </Pressable>
            </View>
          ) : null}

          <View style={styles.listCard}>
            <View style={styles.listHeading}>
              <View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionHint}>{result?.totalCount ?? 0} contactos · {babyName}</Text></View>
              <Pressable accessibilityLabel="Actualizar contactos" onPress={() => setReloadVersion((value) => value + 1)} style={styles.refresh}><RefreshCw color={colors.primaryPressed} size={20} /></Pressable>
            </View>
            <View style={[styles.searchRow, compact && styles.searchRowCompact]}>
              <ProfileField autoCapitalize="words" label="Buscar por nombre" onChangeText={setSearchDraft} onSubmitEditing={() => { setPage(1); setSearch(searchDraft.trim()); }} placeholder="Pediatra, farmacia…" returnKeyType="search" trailing={<Search color={colors.textMuted} size={18} />} value={searchDraft} />
              <Pressable onPress={() => { setPage(1); setSearch(searchDraft.trim()); }} style={styles.searchButton}><Text style={styles.searchButtonText}>Buscar</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
              <FilterChip label="Todas" onPress={() => { setCategory('all'); setPage(1); }} selected={category === 'all'} />
              {categoryOptions.map((option) => <FilterChip key={option.value} label={option.label} onPress={() => { setCategory(option.value); setPage(1); }} selected={category === option.value} />)}
            </ScrollView>

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {copied ? <Text accessibilityLiveRegion="polite" style={styles.success}>{copied}</Text> : null}
            {isLoading ? <ActivityIndicator color={colors.primaryPressed} style={styles.loader} /> : contacts.length ? (
              <View style={[styles.grid, compact && styles.gridCompact]}>
                {contacts.map((contact) => (
                  <ContactCard
                    canManage={canManageBabyContact(contact.authorUserId, userId, familyRole)}
                    contact={contact}
                    key={contact.id}
                    onAction={runAction}
                    onEdit={() => beginEdit(contact)}
                    onOpenAddress={openAddress}
                    onRetire={() => setConfirming(contact)}
                    onSave={() => void saveContact(contact)}
                    onShowQr={() => setQrContact(contact)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.empty}><UsersRound color={colors.aqua} size={38} /><Text style={styles.emptyTitle}>No hay contactos aquí</Text><Text style={styles.emptyText}>Prueba otra búsqueda o añade el primer contacto de {babyName}.</Text></View>
            )}

            <DataPagination onChangePage={setPage} onChangePageSize={(value) => { setPageSize(value); setPage(1); }} page={page} pageSize={pageSize} total={result?.totalCount ?? 0} totalPages={result?.totalPages ?? 1} />
            <Pressable onPress={() => { setRetired((value) => !value); setPage(1); resetForm(); }}><Text style={styles.retiredLink}>{retired ? 'Volver a contactos activos' : 'Ver contactos retirados'}</Text></Pressable>
          </View>
        </View>
      </ScrollView>

      <ConfirmationModal
        confirmLabel={confirming?.retiredAt ? 'Restaurar' : 'Retirar durante 30 días'}
        description={confirming?.retiredAt ? 'Volverá a estar disponible para toda la familia.' : 'Dejará de verse, pero podrás restaurarlo durante 30 días antes de su eliminación definitiva.'}
        icon={confirming?.retiredAt ? <RotateCcw color={colors.primaryPressed} size={24} /> : <Archive color={colors.error} size={24} />}
        isPending={isSaving}
        onCancel={() => setConfirming(undefined)}
        onConfirm={() => void changeRetirement()}
        title={confirming?.retiredAt ? `¿Restaurar ${confirming.name}?` : `¿Retirar ${confirming?.name ?? 'este contacto'}?`}
        tone={confirming?.retiredAt ? 'primary' : 'danger'}
        visible={Boolean(confirming)}
      />
      <MapAppChooserModal
        onCancel={() => setMapAddress(undefined)}
        onSelect={openAddressWith}
        visible={Boolean(mapAddress)}
      />
      <BabyContactQrModal contact={qrContact} onClose={() => setQrContact(undefined)} />
    </SafeAreaView>
  );
}

function FilterChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.filter, selected && styles.filterSelected]}><Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text></Pressable>;
}

function ContactCard({ canManage, contact, onAction, onEdit, onOpenAddress, onRetire, onSave, onShowQr }: { canManage: boolean; contact: BabyContact; onAction: (action: () => Promise<void>, success?: string) => Promise<void>; onEdit: () => void; onOpenAddress: (address: string) => void; onRetire: () => void; onSave: () => void; onShowQr: () => void }) {
  const copyAll = [contact.name, contact.contactPerson, contact.phone, contact.address, contact.websiteUrl, contact.notes].filter(Boolean).join('\n');
  return (
    <View style={[styles.contactCard, contact.isFeatured && styles.contactCardFeatured]}>
      <View style={styles.contactHeader}>
        <View style={styles.contactIcon}>{contact.isFeatured ? <Star color={colors.butter} fill={colors.butter} size={20} /> : <MapPin color={colors.primaryPressed} size={20} />}</View>
        <View style={styles.contactCopy}><Text style={styles.contactName}>{contact.name}</Text><Text style={styles.contactMeta}>{categoryLabels[contact.category]}{contact.contactPerson ? ` · ${contact.contactPerson}` : ''}</Text></View>
      </View>
      {contact.phone ? <ContactValue icon={<Phone color={colors.textMuted} size={17} />} label={contact.phone} onCopy={() => onAction(() => copyBabyContactValue(contact.phone!), 'Teléfono copiado')} onOpen={() => onAction(() => callBabyContact(contact.phone!))} /> : null}
      {contact.address ? <ContactValue icon={<MapPin color={colors.textMuted} size={17} />} label={contact.address} onCopy={() => onAction(() => copyBabyContactValue(contact.address!), 'Dirección copiada')} onOpen={() => onOpenAddress(contact.address!)} /> : null}
      {contact.websiteUrl ? <ContactValue icon={<Globe color={colors.textMuted} size={17} />} label={contact.websiteUrl} onCopy={() => onAction(() => copyBabyContactValue(contact.websiteUrl!), 'Enlace copiado')} onOpen={() => onAction(() => openBabyContactWebsite(contact.websiteUrl!))} /> : null}
      {contact.notes ? <Text style={styles.contactNotes}>{contact.notes}</Text> : null}
      <View style={styles.contactActions}>
        <Pressable onPress={onSave} style={styles.action}><UserPlus color={colors.primaryPressed} size={16} /><Text style={styles.actionText}>Guardar</Text></Pressable>
        <Pressable onPress={onShowQr} style={styles.action}><QrCode color={colors.primaryPressed} size={16} /><Text style={styles.actionText}>QR</Text></Pressable>
        <Pressable onPress={() => void onAction(() => copyBabyContactValue(copyAll), 'Contacto copiado')} style={styles.action}><Clipboard color={colors.primaryPressed} size={16} /><Text style={styles.actionText}>Copiar</Text></Pressable>
        {canManage ? <><Pressable disabled={Boolean(contact.retiredAt)} onPress={onEdit} style={[styles.action, contact.retiredAt && styles.disabled]}><ExternalLink color={colors.primaryPressed} size={16} /><Text style={styles.actionText}>Editar</Text></Pressable><Pressable onPress={onRetire} style={styles.action}><Archive color={contact.retiredAt ? colors.primaryPressed : colors.error} size={16} /><Text style={contact.retiredAt ? styles.actionText : styles.dangerText}>{contact.retiredAt ? 'Restaurar' : 'Retirar'}</Text></Pressable></> : null}
      </View>
    </View>
  );
}

function MapAppChooserModal({ onCancel, onSelect, visible }: { onCancel: () => void; onSelect: (target: BabyContactMapTarget) => void; visible: boolean }) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} statusBarTranslucent transparent visible={visible}>
      <SafeAreaView style={styles.mapModalRoot}>
        <Pressable accessibilityLabel="Cerrar selector de mapas" accessibilityRole="button" onPress={onCancel} style={styles.mapModalBackdrop} />
        <View accessibilityLabel="Elegir aplicación de mapas" accessibilityViewIsModal style={styles.mapModalCard}>
          <View style={styles.mapModalIcon}><MapPin color={colors.primaryPressed} size={24} /></View>
          <View style={styles.mapModalCopy}>
            <Text style={styles.mapModalEyebrow}>ABRIR DIRECCIÓN</Text>
            <Text style={styles.mapModalTitle}>¿Qué mapa quieres usar?</Text>
            <Text style={styles.mapModalDescription}>Puedes abrir Google Maps o la aplicación de mapas configurada en este dispositivo.</Text>
          </View>
          <View style={styles.mapModalActions}>
            <Pressable accessibilityRole="button" onPress={() => onSelect('google')} style={({ pressed }) => [styles.mapOption, styles.googleMapOption, pressed && styles.pressed]}>
              <Text style={styles.googleMapOptionText}>Google Maps</Text>
              <ExternalLink color={colors.onAccent} size={18} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => onSelect('system')} style={({ pressed }) => [styles.mapOption, styles.systemMapOption, pressed && styles.pressed]}>
              <Text style={styles.systemMapOptionText}>Aplicación de mapas</Text>
              <MapPin color={colors.primaryPressed} size={18} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onCancel} style={({ pressed }) => [styles.cancelMapOption, pressed && styles.pressed]}>
              <Text style={styles.cancelMapOptionText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ContactValue({ icon, label, onCopy, onOpen }: { icon: ReactNode; label: string; onCopy: () => void; onOpen: () => void }) {
  return <View style={styles.valueRow}>{icon}<Text numberOfLines={2} style={styles.valueText}>{label}</Text><Pressable accessibilityLabel={`Copiar ${label}`} onPress={onCopy} style={styles.miniAction}><Clipboard color={colors.primaryPressed} size={15} /></Pressable><Pressable accessibilityLabel={`Abrir ${label}`} onPress={onOpen} style={styles.miniAction}><ExternalLink color={colors.primaryPressed} size={15} /></Pressable></View>;
}

const styles = createThemedStyleSheet((colors) => ({
  safeArea: { backgroundColor: colors.background, flex: 1 }, page: { flexGrow: 1, paddingBottom: 120 }, content: { alignSelf: 'center', gap: spacing.xl, maxWidth: 1180, padding: spacing.lg, width: '100%' },
  hero: { alignItems: 'center', backgroundColor: colors.lavenderSoft, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.lg, padding: spacing.xl }, heroCompact: { alignItems: 'flex-start', flexDirection: 'column' }, heroIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 }, heroCopy: { flex: 1 }, eyebrow: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }, title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.6, lineHeight: 36 }, subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.xs }, backButton: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, backButtonText: { color: colors.primaryPressed, fontWeight: '900' },
  createArea: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, justifyContent: 'space-between' }, sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '900' }, sectionHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 }, addButton: { alignItems: 'center', backgroundColor: colors.primaryPressed, borderRadius: radius.pill, flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.lg }, addButtonText: { color: colors.onAccent, fontWeight: '900' },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl }, sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, cancelText: { color: colors.error, fontWeight: '800' }, formRow: { flexDirection: 'row', gap: spacing.lg }, formRowCompact: { flexDirection: 'column' }, notesInput: { minHeight: 78, textAlignVertical: 'top' }, featuredRow: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg }, featuredTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: 'center', minHeight: 54 }, primaryButtonText: { color: colors.onAccent, fontSize: 15, fontWeight: '900' }, disabled: { opacity: 0.45 },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl }, listHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 46, justifyContent: 'center', width: 46 }, searchRow: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.md }, searchRowCompact: { alignItems: 'stretch', flexDirection: 'column' }, searchButton: { alignItems: 'center', backgroundColor: colors.primaryPressed, borderRadius: radius.md, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.xl }, searchButtonText: { color: colors.onAccent, fontWeight: '900' }, filters: { gap: spacing.sm }, filter: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, minHeight: 44, paddingHorizontal: spacing.lg, justifyContent: 'center' }, filterSelected: { backgroundColor: colors.primaryPressed }, filterText: { color: colors.textMuted, fontWeight: '800' }, filterTextSelected: { color: colors.onAccent },
  error: { color: colors.error, fontSize: 13, lineHeight: 19 }, success: { color: colors.primaryPressed, fontSize: 13, fontWeight: '800' }, loader: { marginVertical: spacing.xxl }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, gridCompact: { flexDirection: 'column' }, contactCard: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexBasis: 420, flexGrow: 1, gap: spacing.md, minWidth: 300, padding: spacing.lg }, contactCardFeatured: { borderColor: colors.butter, borderTopWidth: 5 }, contactHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, contactIcon: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 }, contactCopy: { flex: 1 }, contactName: { color: colors.text, fontSize: 17, fontWeight: '900' }, contactMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 }, valueRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, valueText: { color: colors.text, flex: 1, fontSize: 13, lineHeight: 18 }, miniAction: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 34, justifyContent: 'center', width: 34 }, contactNotes: { color: colors.textMuted, fontSize: 13, lineHeight: 19 }, contactActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, action: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, minHeight: 40, paddingHorizontal: spacing.md }, actionText: { color: colors.primaryPressed, fontSize: 12, fontWeight: '800' }, dangerText: { color: colors.error, fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, emptyText: { color: colors.textMuted, textAlign: 'center' }, retiredLink: { color: colors.primaryPressed, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  mapModalRoot: { alignItems: 'center', backgroundColor: 'rgba(24, 35, 75, 0.58)', flex: 1, justifyContent: 'center', padding: spacing.lg }, mapModalBackdrop: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }, mapModalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, elevation: 12, gap: spacing.lg, maxWidth: 460, padding: spacing.xl, shadowColor: colors.text, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.2, shadowRadius: 28, width: '100%' }, mapModalIcon: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 }, mapModalCopy: { gap: spacing.sm }, mapModalEyebrow: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 }, mapModalTitle: { color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -0.4, lineHeight: 31 }, mapModalDescription: { color: colors.textMuted, fontSize: 15, lineHeight: 22 }, mapModalActions: { gap: spacing.sm }, mapOption: { alignItems: 'center', borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.lg }, googleMapOption: { backgroundColor: colors.primaryPressed }, googleMapOptionText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' }, systemMapOption: { backgroundColor: colors.aquaSoft }, systemMapOptionText: { color: colors.primaryPressed, fontSize: 14, fontWeight: '900' }, cancelMapOption: { alignItems: 'center', minHeight: 44, justifyContent: 'center' }, cancelMapOptionText: { color: colors.textMuted, fontSize: 14, fontWeight: '800' }, pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
}));
