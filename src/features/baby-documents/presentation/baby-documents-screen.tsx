import { Archive, Download, FileText, FolderOpen, Pencil, Plus, RefreshCw, RotateCcw } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canManageBabyDocument } from '@/features/baby-documents/application/baby-document-permissions';
import { BabyDocumentError, type BabyDocumentMetadata, type BabyDocumentRepository, type PreparedBabyDocumentFile } from '@/features/baby-documents/application/baby-document-repository';
import type { BabyDocument, BabyDocumentCategory } from '@/features/baby-documents/domain/baby-document';
import { openBabyDocument, saveBabyDocument } from '@/features/baby-documents/infrastructure/baby-document-file';
import { pickBabyDocument } from '@/features/baby-documents/infrastructure/baby-document-picker';
import { DatePickerField } from '@/features/baby-profile/presentation/date-picker-field';
import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import { SelectField, type SelectOption } from '@/features/baby-profile/presentation/select-field';
import type { FamilyRole } from '@/features/family/domain/family';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const categoryOptions = [
  { label: 'Informe', value: 'report' },
  { label: 'Autorización', value: 'authorization' },
  { label: 'Carnet', value: 'card' },
  { label: 'Otro', value: 'other' },
] satisfies SelectOption<BabyDocumentCategory>[];

const categoryLabels = Object.fromEntries(categoryOptions.map(({ label, value }) => [value, label])) as Record<BabyDocumentCategory, string>;

interface BabyDocumentsScreenProps {
  babyId: string;
  babyName: string;
  familyRole: FamilyRole;
  onBack: () => void;
  repository: BabyDocumentRepository;
  topContent?: ReactNode;
  userId: string;
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;
}

function formatDate(value?: string): string {
  if (!value) return 'Sin fecha documental';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

function errorMessage(error: unknown): string {
  if (error instanceof BabyDocumentError && error.reason === 'invalid_file') return 'Elige un PDF, JPG o PNG de hasta 10 MB.';
  if (error instanceof BabyDocumentError && error.reason === 'not_allowed') return 'No tienes permiso para realizar este cambio.';
  if (error instanceof BabyDocumentError && error.reason === 'upload_failed') return 'No pudimos subir el archivo. Comprueba la conexión e inténtalo de nuevo.';
  return 'No pudimos completar la acción. Inténtalo de nuevo.';
}

export function BabyDocumentsScreen({ babyId, babyName, familyRole, onBack, repository, topContent, userId }: BabyDocumentsScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [documents, setDocuments] = useState<BabyDocument[]>([]);
  const [includeRetired, setIncludeRetired] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<BabyDocumentCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedFile, setSelectedFile] = useState<PreparedBabyDocumentFile>();
  const [editing, setEditing] = useState<BabyDocument>();
  const [confirming, setConfirming] = useState<BabyDocument>();
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BabyDocumentCategory>('report');
  const [documentDate, setDocumentDate] = useState('');

  useEffect(() => {
    let active = true;
    void repository.load(babyId, includeRetired).then((result) => active && setDocuments(result)).catch((reason) => active && setError(errorMessage(reason))).finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [babyId, includeRetired, reloadVersion, repository]);

  const visibleDocuments = useMemo(() => categoryFilter === 'all' ? documents : documents.filter((document) => document.category === categoryFilter), [categoryFilter, documents]);

  function resetForm() {
    setSelectedFile(undefined);
    setDisplayName('');
    setDescription('');
    setCategory('report');
    setDocumentDate('');
    setEditing(undefined);
  }

  function beginEdit(document: BabyDocument) {
    setEditing(document);
    setSelectedFile(undefined);
    setDisplayName(document.displayName);
    setDescription(document.description ?? '');
    setCategory(document.category);
    setDocumentDate(document.documentDate ?? '');
  }

  async function chooseFile() {
    try {
      setError(undefined);
      const file = await pickBabyDocument();
      if (!file) return;
      setSelectedFile(file);
      if (!editing && !displayName.trim()) setDisplayName(file.name.replace(/\.[^.]+$/, ''));
    } catch (reason) { setError(errorMessage(reason)); }
  }

  async function submit() {
    if (!displayName.trim() || (!editing && !selectedFile)) {
      setError('Indica un nombre y selecciona un archivo.');
      return;
    }
    const metadata: BabyDocumentMetadata = { category, description: description.trim() || undefined, displayName: displayName.trim(), documentDate: documentDate || undefined };
    setIsSaving(true);
    setError(undefined);
    try {
      if (editing) {
        await repository.updateMetadata(editing.id, metadata);
        if (selectedFile) await repository.replace(editing.id, selectedFile);
      } else if (selectedFile) {
        await repository.create(babyId, metadata, selectedFile);
      }
      resetForm();
      setReloadVersion((value) => value + 1);
    } catch (reason) { setError(errorMessage(reason)); } finally { setIsSaving(false); }
  }

  async function open(document: BabyDocument, download = false) {
    try {
      setError(undefined);
      const url = await repository.createAccessUrl(document.id);
      if (download) await saveBabyDocument({ fileName: document.originalFileName, mimeType: document.mimeType, url });
      else await openBabyDocument(url);
    } catch (reason) { setError(errorMessage(reason)); }
  }

  async function confirmRetirement() {
    if (!confirming) return;
    setIsSaving(true);
    try {
      await repository.setRetired(confirming.id, !confirming.retiredAt);
      setConfirming(undefined);
      setReloadVersion((value) => value + 1);
    } catch (reason) { setError(errorMessage(reason)); } finally { setIsSaving(false); }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          {topContent}
          <View style={[styles.hero, compact && styles.heroCompact]}>
            <View style={styles.heroIcon}><FolderOpen color={colors.aqua} size={30} /></View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>DOCUMENTACIÓN PRIVADA</Text>
              <Text style={styles.title}>Documentos de {babyName}</Text>
              <Text style={styles.subtitle}>Informes, autorizaciones y carnets disponibles solo para esta familia.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.backButtonText}>Volver al bebé</Text></Pressable>
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeading}>
              <View><Text style={styles.sectionTitle}>{editing ? 'Editar documento' : 'Añadir documento'}</Text><Text style={styles.sectionHint}>PDF, JPG o PNG · máximo 10 MB</Text></View>
              {editing ? <Pressable onPress={resetForm}><Text style={styles.cancelText}>Cancelar</Text></Pressable> : null}
            </View>
            <Pressable accessibilityRole="button" onPress={() => void chooseFile()} style={styles.fileButton}><Plus color={colors.primaryPressed} size={20} /><Text style={styles.fileButtonText}>{selectedFile?.name ?? (editing ? 'Sustituir archivo (opcional)' : 'Seleccionar archivo')}</Text></Pressable>
            <View style={[styles.formRow, compact && styles.formRowCompact]}>
              <ProfileField label="Nombre visible" maxLength={160} onChangeText={setDisplayName} placeholder="Ej. Informe de pediatría" value={displayName} />
              <SelectField label="Categoría" onChange={setCategory} options={categoryOptions} placeholder="Seleccionar" title="Categoría del documento" value={category} />
            </View>
            <View style={[styles.formRow, compact && styles.formRowCompact]}>
              <DatePickerField label="Fecha del documento" maximumDate={new Date().toISOString().slice(0, 10)} onChange={setDocumentDate} value={documentDate} />
              <ProfileField label="Descripción opcional" maxLength={500} onChangeText={setDescription} placeholder="Contexto útil para la familia" value={description} />
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void submit()} style={[styles.primaryButton, isSaving && styles.disabled]}>{isSaving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryButtonText}>{editing ? 'Guardar cambios' : 'Guardar documento'}</Text>}</Pressable>
          </View>

          <View style={styles.listCard}>
            <View style={styles.listHeading}>
              <View><Text style={styles.sectionTitle}>{includeRetired ? 'Documentos retirados' : 'Documentos'}</Text><Text style={styles.sectionHint}>{isLoading ? 'Actualizando…' : `${visibleDocuments.length} disponibles`}</Text></View>
              <Pressable accessibilityLabel="Actualizar documentos" onPress={() => { setIsLoading(true); setError(undefined); setReloadVersion((value) => value + 1); }} style={styles.refresh}><RefreshCw color={colors.aqua} size={19} /></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {([{ label: 'Todos', value: 'all' }, ...categoryOptions] as const).map((option) => <Pressable key={option.value} onPress={() => setCategoryFilter(option.value)} style={[styles.filter, categoryFilter === option.value && styles.filterSelected]}><Text style={[styles.filterText, categoryFilter === option.value && styles.filterTextSelected]}>{option.label}</Text></Pressable>)}
            </ScrollView>
            {isLoading ? <ActivityIndicator color={colors.aqua} style={styles.loader} /> : null}
            {!isLoading && visibleDocuments.length === 0 ? <View style={styles.empty}><FileText color={colors.textMuted} size={30} /><Text style={styles.emptyTitle}>{includeRetired ? 'No hay documentos retirados' : 'Aún no hay documentos'}</Text><Text style={styles.emptyText}>Cuando la familia añada uno, aparecerá aquí.</Text></View> : null}
            <View style={[styles.grid, compact && styles.gridCompact]}>
              {visibleDocuments.map((document) => {
                const canManage = canManageBabyDocument(familyRole, userId, document);
                return <View key={document.id} style={styles.documentCard}>
                  <View style={styles.documentHeader}><View style={styles.documentIcon}><FileText color={colors.primaryPressed} size={22} /></View><View style={styles.documentCopy}><Text numberOfLines={2} style={styles.documentTitle}>{document.displayName}</Text><Text style={styles.documentMeta}>{categoryLabels[document.category]} · {formatDate(document.documentDate)}</Text></View></View>
                  {document.description ? <Text numberOfLines={3} style={styles.documentDescription}>{document.description}</Text> : null}
                  <Text style={styles.documentMeta}>Añadido por {document.authorName} · {formatBytes(document.fileSizeBytes)}</Text>
                  <View style={styles.documentActions}>
                    <Pressable onPress={() => void open(document)} style={styles.secondaryAction}><FolderOpen color={colors.aqua} size={17} /><Text style={styles.secondaryActionText}>Abrir</Text></Pressable>
                    <Pressable onPress={() => void open(document, true)} style={styles.secondaryAction}><Download color={colors.aqua} size={17} /><Text style={styles.secondaryActionText}>Guardar</Text></Pressable>
                    {canManage && !document.retiredAt ? <Pressable onPress={() => beginEdit(document)} style={styles.secondaryAction}><Pencil color={colors.aqua} size={17} /><Text style={styles.secondaryActionText}>Editar</Text></Pressable> : null}
                    {canManage ? <Pressable onPress={() => setConfirming(document)} style={styles.secondaryAction}>{document.retiredAt ? <RotateCcw color={colors.coral} size={17} /> : <Archive color={colors.coral} size={17} />}<Text style={styles.dangerActionText}>{document.retiredAt ? 'Restaurar' : 'Retirar'}</Text></Pressable> : null}
                  </View>
                </View>;
              })}
            </View>
            <Pressable onPress={() => { setIsLoading(true); setError(undefined); setIncludeRetired((value) => !value); setCategoryFilter('all'); }}><Text style={styles.retiredLink}>{includeRetired ? 'Volver a documentos activos' : 'Ver documentos retirados'}</Text></Pressable>
          </View>
        </View>
      </ScrollView>
      <ConfirmationModal confirmLabel={confirming?.retiredAt ? 'Restaurar' : 'Retirar'} description={confirming?.retiredAt ? 'El documento volverá a estar disponible para la familia.' : 'Dejará de aparecer en la lista principal, pero podrá restaurarse.'} icon={<Archive color={colors.error} size={24} />} isPending={isSaving} onCancel={() => setConfirming(undefined)} onConfirm={() => void confirmRetirement()} title={confirming?.retiredAt ? '¿Restaurar documento?' : '¿Retirar documento?'} tone={confirming?.retiredAt ? 'primary' : 'danger'} visible={Boolean(confirming)} />
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  safeArea: { backgroundColor: colors.background, flex: 1 }, page: { paddingBottom: 112 }, content: { alignSelf: 'center', gap: spacing.xl, maxWidth: 1180, padding: spacing.lg, width: '100%' },
  hero: { alignItems: 'center', backgroundColor: colors.lavenderSoft, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.lg, padding: spacing.xl }, heroCompact: { alignItems: 'flex-start', flexDirection: 'column' }, heroIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, height: 64, justifyContent: 'center', width: 64 }, heroCopy: { flex: 1, gap: spacing.xs }, eyebrow: { color: colors.primaryPressed, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 28, fontWeight: '900' }, subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 }, backButton: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, backButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl }, sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '900' }, sectionHint: { color: colors.textMuted, fontSize: 13, marginTop: 3 }, cancelText: { color: colors.error, fontWeight: '800' }, fileButton: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, minHeight: 54, paddingHorizontal: spacing.lg }, fileButtonText: { color: colors.primaryPressed, flex: 1, fontWeight: '800' }, formRow: { flexDirection: 'row', gap: spacing.lg }, formRowCompact: { flexDirection: 'column' }, error: { color: colors.error, fontSize: 13, lineHeight: 19 }, primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: 'center', minHeight: 54 }, primaryButtonText: { color: colors.onAccent, fontSize: 15, fontWeight: '900' }, disabled: { opacity: 0.55 },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl }, listHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, refresh: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.pill, height: 44, justifyContent: 'center', width: 44 }, filters: { gap: spacing.sm }, filter: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }, filterSelected: { backgroundColor: colors.primaryPressed }, filterText: { color: colors.textMuted, fontWeight: '800' }, filterTextSelected: { color: colors.onAccent }, loader: { marginVertical: spacing.xl }, empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, emptyText: { color: colors.textMuted, textAlign: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, gridCompact: { flexDirection: 'column' }, documentCard: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexBasis: 360, flexGrow: 1, gap: spacing.md, minWidth: 280, padding: spacing.lg }, documentHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, documentIcon: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 }, documentCopy: { flex: 1 }, documentTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, documentMeta: { color: colors.textMuted, fontSize: 12, lineHeight: 17 }, documentDescription: { color: colors.text, fontSize: 13, lineHeight: 19 }, documentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, secondaryAction: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, secondaryActionText: { color: colors.primaryPressed, fontSize: 12, fontWeight: '800' }, dangerActionText: { color: colors.error, fontSize: 12, fontWeight: '800' }, retiredLink: { color: colors.primaryPressed, fontSize: 13, fontWeight: '800', textAlign: 'center' },
}));
