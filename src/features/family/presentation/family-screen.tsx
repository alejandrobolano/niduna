import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FamilyOperationError,
  type FamilyRepository,
} from '@/features/family/application/family-repository';
import {
  formatInvitationCode,
  isInvitationCodeComplete,
} from '@/features/family/application/invitation-code';
import { canRemoveFamilyMember } from '@/features/family/application/family-member-permissions';
import type {
  CreatedFamilyInvitation,
  Family,
  FamilyMember,
  FamilyRelationship,
  FamilyRole,
  InvitableFamilyRole,
} from '@/features/family/domain/family';
import type { FamilyBabyGroup } from '@/features/family/domain/family-baby-context';
import { FamilyBabyManagement } from '@/features/family/presentation/family-baby-management';
import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import {
  SelectField,
  type SelectOption,
} from '@/features/baby-profile/presentation/select-field';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, radius, spacing } from '@/shared/presentation/theme';

const invitationRoleOptions = [
  {
    label: 'Administrador',
    supportingText: 'Puede gestionar el perfil y crear invitaciones.',
    value: 'admin',
  },
  {
    label: 'Cuidador',
    supportingText: 'Podrá registrar cuidados, pero no administrar la familia.',
    value: 'caregiver',
  },
  {
    label: 'Solo lectura',
    supportingText: 'Puede consultar la información sin modificarla.',
    value: 'viewer',
  },
] satisfies SelectOption<InvitableFamilyRole>[];

const relationshipOptions = [
  { label: 'Madre', value: 'mother' },
  { label: 'Padre', value: 'father' },
  {
    label: 'Otro progenitor/a',
    supportingText: 'Si madre o padre no describen cómo quieres identificarte.',
    value: 'parent',
  },
  { label: 'Tutor/a', value: 'guardian' },
  { label: 'Abuelo/a', value: 'grandparent' },
  { label: 'Familiar', value: 'relative' },
  { label: 'Cuidador/a profesional', value: 'professional_caregiver' },
  { label: 'Otra relación', value: 'other' },
] satisfies SelectOption<FamilyRelationship>[];

const roleLabels: Record<FamilyRole, string> = {
  admin: 'Administrador',
  caregiver: 'Cuidador',
  owner: 'Propietario',
  viewer: 'Solo lectura',
};

const relationshipLabels: Record<FamilyRelationship, string> = {
  father: 'Padre',
  grandparent: 'Abuelo/a',
  guardian: 'Tutor/a',
  mother: 'Madre',
  other: 'Otra relación',
  parent: 'Otro progenitor/a',
  professional_caregiver: 'Cuidador/a profesional',
  relative: 'Familiar',
};

function formatExpiry(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function getOperationMessage(error: unknown): string {
  if (!(error instanceof FamilyOperationError)) {
    return 'No pudimos completar la operación. Inténtalo de nuevo.';
  }

  const messages: Record<FamilyOperationError['reason'], string> = {
    already_member: 'Ya formas parte de esta familia.',
    invalid_code: 'El código no tiene un formato válido.',
    not_allowed: 'Tu rol no permite realizar esta acción.',
    unavailable: 'El código ha caducado, fue utilizado o está revocado.',
    unknown: 'No pudimos completar la operación. Inténtalo de nuevo.',
  };

  return messages[error.reason];
}

interface FamilyScreenProps {
  babyGroups?: FamilyBabyGroup[];
  onContextChanged?: (preferredFamilyId?: string) => Promise<void> | void;
  onFollowBaby?: (babyId: string) => Promise<void>;
  onRestoreBaby?: (babyId: string) => Promise<void>;
  repository: FamilyRepository;
  topContent?: ReactNode;
  userId: string;
}

export function FamilyScreen({
  babyGroups = [],
  onContextChanged,
  onFollowBaby,
  onRestoreBaby,
  repository,
  topContent,
  userId,
}: FamilyScreenProps) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [familyName, setFamilyName] = useState('');
  const [creatorDisplayName, setCreatorDisplayName] = useState('');
  const [creatorRelationship, setCreatorRelationship] =
    useState<FamilyRelationship>();
  const [invitationCode, setInvitationCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [relationship, setRelationship] = useState<FamilyRelationship>();
  const [invitationRole, setInvitationRole] =
    useState<InvitableFamilyRole>();
  const [createdInvitation, setCreatedInvitation] =
    useState<CreatedFamilyInvitation>();
  const [isWorking, setIsWorking] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string>();
  const [operationSucceeded, setOperationSucceeded] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [identityDisplayName, setIdentityDisplayName] = useState('');
  const [identityRelationship, setIdentityRelationship] =
    useState<FamilyRelationship>();
  const [memberToRemove, setMemberToRemove] = useState<FamilyMember>();

  useEffect(() => {
    let active = true;

    void repository
      .load(userId)
      .then((loadedFamilies) => {
        if (!active) {
          return;
        }

        setFamilies(loadedFamilies);
        setSelectedFamilyId((currentId) =>
          loadedFamilies.some((family) => family.id === currentId)
            ? currentId
            : loadedFamilies[0]?.id,
        );
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, repository, userId]);

  const selectedFamily = useMemo(
    () =>
      families.find((family) => family.id === selectedFamilyId) ?? families[0],
    [families, selectedFamilyId],
  );
  const selectedBabyGroup = babyGroups.find(
    (group) => group.id === selectedFamily?.id,
  );
  const canManageFamily =
    selectedFamily?.currentUserRole === 'owner' ||
    selectedFamily?.currentUserRole === 'admin';
  const currentMember = selectedFamily?.members.find(
    (member) => member.isCurrentUser,
  );

  async function refreshFamilies(preferredFamilyId?: string) {
    const loadedFamilies = await repository.load(userId);
    setFamilies(loadedFamilies);
    setSelectedFamilyId(
      preferredFamilyId && loadedFamilies.some((family) => family.id === preferredFamilyId)
        ? preferredFamilyId
        : loadedFamilies[0]?.id,
    );
    await onContextChanged?.(preferredFamilyId);
  }

  function startOperation() {
    setIsWorking(true);
    setOperationMessage(undefined);
    setOperationSucceeded(false);
  }

  function finishWithError(error: unknown) {
    setOperationMessage(getOperationMessage(error));
    setOperationSucceeded(false);
    setIsWorking(false);
  }

  async function handleCreateFamily() {
    const normalizedName = familyName.trim();

    if (!normalizedName || normalizedName.length > 80) {
      setOperationMessage('Escribe un nombre de familia de hasta 80 caracteres.');
      setOperationSucceeded(false);
      return;
    }

    if (!creatorDisplayName.trim() || creatorDisplayName.trim().length > 80) {
      setOperationMessage('Indica cómo te llamas para que la familia te reconozca.');
      setOperationSucceeded(false);
      return;
    }

    if (!creatorRelationship) {
      setOperationMessage('Selecciona tu relación con el bebé.');
      setOperationSucceeded(false);
      return;
    }

    startOperation();

    try {
      const familyId = await repository.createFamily({
        displayName: creatorDisplayName,
        name: normalizedName,
        relationship: creatorRelationship,
      });
      await refreshFamilies(familyId);
      setFamilyName('');
      setCreatorDisplayName('');
      setCreatorRelationship(undefined);
      setOperationMessage('Familia creada. Ya puedes invitar a otra persona.');
      setOperationSucceeded(true);
      setIsWorking(false);
    } catch (error) {
      finishWithError(error);
    }
  }

  function openIdentityEditor() {
    if (!currentMember) {
      return;
    }

    setIdentityDisplayName(currentMember.displayName ?? '');
    setIdentityRelationship(currentMember.relationship);
    setIsEditingIdentity(true);
    setOperationMessage(undefined);
  }

  async function handleUpdateIdentity() {
    if (!selectedFamily || !identityDisplayName.trim()) {
      setOperationMessage('Indica cómo te llamas para que la familia te reconozca.');
      setOperationSucceeded(false);
      return;
    }

    if (!identityRelationship) {
      setOperationMessage('Selecciona tu relación con el bebé.');
      setOperationSucceeded(false);
      return;
    }

    startOperation();

    try {
      await repository.updateIdentity({
        displayName: identityDisplayName,
        familyId: selectedFamily.id,
        relationship: identityRelationship,
      });
      await refreshFamilies(selectedFamily.id);
      setIsEditingIdentity(false);
      setOperationMessage('Tu identidad familiar está actualizada.');
      setOperationSucceeded(true);
      setIsWorking(false);
    } catch (error) {
      finishWithError(error);
    }
  }

  async function handleAcceptInvitation() {
    if (!isInvitationCodeComplete(invitationCode)) {
      setOperationMessage('Introduce los 16 caracteres del código.');
      setOperationSucceeded(false);
      return;
    }

    if (!displayName.trim() || displayName.trim().length > 80) {
      setOperationMessage('Indica cómo te llamas para que la familia te reconozca.');
      setOperationSucceeded(false);
      return;
    }

    if (!relationship) {
      setOperationMessage('Selecciona tu relación con el bebé.');
      setOperationSucceeded(false);
      return;
    }

    startOperation();

    try {
      const familyId = await repository.acceptInvitation({
        code: invitationCode,
        displayName,
        relationship,
      });
      await refreshFamilies(familyId);
      setInvitationCode('');
      setDisplayName('');
      setRelationship(undefined);
      setShowJoinForm(false);
      setOperationMessage('Ya formas parte de la familia.');
      setOperationSucceeded(true);
      setIsWorking(false);
    } catch (error) {
      finishWithError(error);
    }
  }

  async function handleCreateInvitation() {
    if (!selectedFamily || !invitationRole) {
      setOperationMessage('Selecciona el permiso de la persona invitada.');
      setOperationSucceeded(false);
      return;
    }

    startOperation();

    try {
      const invitation = await repository.createInvitation(
        selectedFamily.id,
        invitationRole,
      );
      await refreshFamilies(selectedFamily.id);
      setCreatedInvitation(invitation);
      setInvitationRole(undefined);
      setOperationMessage('Código creado. Solo podrá utilizarse una vez.');
      setOperationSucceeded(true);
      setIsWorking(false);
    } catch (error) {
      finishWithError(error);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    if (!selectedFamily) {
      return;
    }

    startOperation();

    try {
      await repository.revokeInvitation(invitationId);
      await refreshFamilies(selectedFamily.id);
      setCreatedInvitation((current) =>
        current?.id === invitationId ? undefined : current,
      );
      setOperationMessage('Invitación revocada.');
      setOperationSucceeded(true);
      setIsWorking(false);
    } catch (error) {
      finishWithError(error);
    }
  }

  async function handleRemoveMember() {
    if (!selectedFamily || !memberToRemove) {
      return;
    }

    startOperation();

    try {
      await repository.removeMember(memberToRemove.id);
      await refreshFamilies(selectedFamily.id);
      setMemberToRemove(undefined);
      setOperationMessage('La persona ya no tiene acceso a esta familia.');
      setOperationSucceeded(true);
      setIsWorking(false);
    } catch (error) {
      finishWithError(error);
    }
  }

  async function handleShareInvitation() {
    if (!createdInvitation || !selectedFamily) {
      return;
    }

    try {
      await Share.share({
        message: `Únete a ${selectedFamily.name} en Niduna con este código: ${createdInvitation.code}. Caduca el ${formatExpiry(createdInvitation.expiresAt)}.`,
      });
    } catch {
      setOperationMessage(
        'No pudimos abrir el menú para compartir. Puedes copiar el código de la tarjeta.',
      );
      setOperationSucceeded(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateScreen}>
          <NuniMascot size={150} />
          <Text style={styles.stateTitle}>Reuniendo a la familia</Text>
          <Text style={styles.stateText}>
            Estamos cargando miembros, permisos e invitaciones.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateScreen}>
          <NuniMascot size={150} />
          <Text style={styles.stateTitle}>No pudimos cargar tu familia</Text>
          <Text style={styles.stateText}>
            Revisa la conexión. No se ha modificado ningún dato.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsLoading(true);
              setLoadError(false);
              setLoadAttempt((attempt) => attempt + 1);
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.retryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Volver a intentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const joinForm = (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={[styles.sectionIcon, styles.lavenderIcon]}>
          <Text style={styles.sectionIconText}>✦</Text>
        </View>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionTitle}>Unirme con un código</Text>
          <Text style={styles.sectionSubtitle}>
            Cada persona inicia sesión con su propia cuenta.
          </Text>
        </View>
      </View>
      <ProfileField
        autoCapitalize="characters"
        autoCorrect={false}
        label="Código de invitación"
        maxLength={19}
        onChangeText={(value) => setInvitationCode(formatInvitationCode(value))}
        placeholder="ABCD-1234-EF56-7890"
        value={invitationCode}
      />
      <ProfileField
        autoCapitalize="words"
        label="Tu nombre"
        maxLength={80}
        onChangeText={setDisplayName}
        placeholder="Cómo te reconocerá la familia"
        value={displayName}
      />
      <SelectField
        eyebrow="TU RELACIÓN"
        label="Relación con el bebé"
        onChange={setRelationship}
        options={relationshipOptions}
        placeholder="Selecciona una opción"
        title="¿Cuál es tu relación?"
        value={relationship}
      />
      <Pressable
        accessibilityRole="button"
        disabled={isWorking}
        onPress={() => void handleAcceptInvitation()}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
          isWorking && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isWorking ? 'Comprobando…' : 'Unirme a la familia'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {topContent}

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>TU RED DE CUIDADOS</Text>
              <Text style={styles.title}>La familia, coordinada</Text>
              <Text style={styles.subtitle}>
                Cada persona usa su cuenta y ve únicamente las familias a las que
                pertenece.
              </Text>
            </View>
            <View style={styles.mascot}>
              <NuniMascot size={150} />
            </View>
          </View>

          {operationMessage ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.notice,
                operationSucceeded ? styles.noticeSuccess : styles.noticeError,
              ]}
            >
              <Text style={styles.noticeMark}>
                {operationSucceeded ? '✓' : '!'}
              </Text>
              <Text style={styles.noticeText}>{operationMessage}</Text>
            </View>
          ) : null}

          {!selectedFamily ? (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <View style={[styles.sectionIcon, styles.aquaIcon]}>
                    <Text style={styles.sectionIconText}>⌂</Text>
                  </View>
                  <View style={styles.sectionHeadingCopy}>
                    <Text style={styles.sectionTitle}>Crear mi familia</Text>
                    <Text style={styles.sectionSubtitle}>
                      Serás la persona propietaria y podrás invitar a los demás.
                    </Text>
                  </View>
                </View>
                <ProfileField
                  autoCapitalize="words"
                  label="Nombre de la familia"
                  maxLength={80}
                  onChangeText={setFamilyName}
                  placeholder="Por ejemplo, Familia Bolaño"
                  value={familyName}
                />
                <ProfileField
                  autoCapitalize="words"
                  label="Tu nombre"
                  maxLength={80}
                  onChangeText={setCreatorDisplayName}
                  placeholder="Cómo te reconocerá la familia"
                  value={creatorDisplayName}
                />
                <SelectField
                  eyebrow="TU RELACIÓN"
                  label="Relación con el bebé"
                  onChange={setCreatorRelationship}
                  options={relationshipOptions}
                  placeholder="Selecciona una opción"
                  title="¿Cuál es tu relación?"
                  value={creatorRelationship}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isWorking}
                  onPress={() => void handleCreateFamily()}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed,
                    isWorking && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Crear familia</Text>
                </Pressable>
              </View>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>O</Text>
                <View style={styles.divider} />
              </View>
              {joinForm}
            </>
          ) : (
            <>
              {families.length > 1 ? (
                <ScrollView
                  contentContainerStyle={styles.familySelector}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {families.map((family) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: family.id === selectedFamily.id,
                      }}
                      key={family.id}
                      onPress={() => {
                        setSelectedFamilyId(family.id);
                        setCreatedInvitation(undefined);
                      }}
                      style={[
                        styles.familyChip,
                        family.id === selectedFamily.id &&
                          styles.familyChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.familyChipText,
                          family.id === selectedFamily.id &&
                            styles.familyChipTextSelected,
                        ]}
                      >
                        {family.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <View style={[styles.section, styles.familySummary]}>
                <View>
                  <Text style={styles.summaryEyebrow}>FAMILIA ACTIVA</Text>
                  <Text style={styles.familyName}>{selectedFamily.name}</Text>
                  <Text style={styles.familyRole}>
                    Tu permiso: {roleLabels[selectedFamily.currentUserRole]}
                  </Text>
                </View>
                <View style={styles.memberCount}>
                  <Text style={styles.memberCountNumber}>
                    {selectedFamily.members.length}
                  </Text>
                  <Text style={styles.memberCountLabel}>
                    {selectedFamily.members.length === 1 ? 'persona' : 'personas'}
                  </Text>
                </View>
              </View>

              <View style={styles.identityBar}>
                <View style={styles.identityCopy}>
                  <Text style={styles.identityTitle}>
                    {currentMember?.displayName ?? 'Completa tu identidad familiar'}
                  </Text>
                  <Text style={styles.identityText}>
                    {currentMember
                      ? relationshipLabels[currentMember.relationship]
                      : 'Tu nombre y relación son visibles para esta familia.'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={openIdentityEditor}
                  style={({ pressed }) => [
                    styles.identityButton,
                    pressed && styles.shareButtonPressed,
                  ]}
                >
                  <Text style={styles.identityButtonText}>Editar mi ficha</Text>
                </Pressable>
              </View>

              {isEditingIdentity ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeading}>
                    <View style={[styles.sectionIcon, styles.aquaIcon]}>
                      <Text style={styles.sectionIconText}>☺</Text>
                    </View>
                    <View style={styles.sectionHeadingCopy}>
                      <Text style={styles.sectionTitle}>Mi identidad familiar</Text>
                      <Text style={styles.sectionSubtitle}>
                        Esto no modifica tus permisos de acceso.
                      </Text>
                    </View>
                  </View>
                  <ProfileField
                    autoCapitalize="words"
                    label="Tu nombre"
                    maxLength={80}
                    onChangeText={setIdentityDisplayName}
                    value={identityDisplayName}
                  />
                  <SelectField
                    eyebrow="TU RELACIÓN"
                    label="Relación con el bebé"
                    onChange={setIdentityRelationship}
                    options={relationshipOptions}
                    placeholder="Selecciona una opción"
                    title="¿Cuál es tu relación?"
                    value={identityRelationship}
                  />
                  <View style={styles.identityActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsEditingIdentity(false)}
                      style={({ pressed }) => [
                        styles.cancelButton,
                        pressed && styles.secondaryButtonPressed,
                      ]}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isWorking}
                      onPress={() => void handleUpdateIdentity()}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        styles.identitySaveButton,
                        pressed && styles.primaryButtonPressed,
                        isWorking && styles.buttonDisabled,
                      ]}
                    >
                      <Text style={styles.primaryButtonText}>Guardar mi ficha</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <View style={[styles.sectionIcon, styles.butterIcon]}>
                    <Text style={styles.sectionIconText}>♡</Text>
                  </View>
                  <View style={styles.sectionHeadingCopy}>
                    <Text style={styles.sectionTitle}>Personas con acceso</Text>
                    <Text style={styles.sectionSubtitle}>
                      El parentesco y los permisos se muestran por separado.
                    </Text>
                  </View>
                </View>
                <View style={styles.memberList}>
                  {selectedFamily.members.map((member) => (
                    <View key={member.id} style={styles.memberRow}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {(member.displayName ?? (member.isCurrentUser ? 'Tú' : 'M'))
                            .slice(0, 1)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberCopy}>
                        <Text style={styles.memberName}>
                          {member.displayName ??
                            (member.isCurrentUser ? 'Tú' : 'Miembro de la familia')}
                          {member.isCurrentUser && member.displayName ? ' · Tú' : ''}
                        </Text>
                        <Text style={styles.memberRelationship}>
                          {relationshipLabels[member.relationship]}
                        </Text>
                        {canRemoveFamilyMember(
                          selectedFamily.currentUserRole,
                          member,
                        ) ? (
                          <Pressable
                            accessibilityRole="link"
                            disabled={isWorking}
                            onPress={() => setMemberToRemove(member)}
                          >
                            <Text style={styles.removeMemberLink}>
                              Quitar de esta familia
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <View style={styles.roleBadge}>
                        <Text numberOfLines={1} style={styles.roleBadgeText}>
                          {roleLabels[member.role]}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                {memberToRemove ? (
                  <View style={styles.memberConfirmation}>
                    <Text style={styles.memberConfirmationTitle}>
                      ¿Quitar a {memberToRemove.displayName ?? 'esta persona'}?
                    </Text>
                    <Text style={styles.memberConfirmationText}>
                      Perderá el acceso a los bebés, registros e historial de
                      esta familia. Su cuenta y sus otras familias no se borrarán.
                    </Text>
                    <View style={styles.memberConfirmationActions}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isWorking}
                        onPress={() => setMemberToRemove(undefined)}
                        style={styles.memberConfirmationCancel}
                      >
                        <Text style={styles.memberConfirmationCancelText}>
                          Cancelar
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isWorking}
                        onPress={() => void handleRemoveMember()}
                        style={styles.memberConfirmationAccept}
                      >
                        <Text style={styles.memberConfirmationAcceptText}>
                          {isWorking ? 'Quitando…' : 'Quitar acceso'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>

              {canManageFamily ? (
                <View style={[styles.section, styles.invitationSection]}>
                  <View style={styles.sectionHeading}>
                    <View style={[styles.sectionIcon, styles.coralIcon]}>
                      <Text style={styles.sectionIconText}>+</Text>
                    </View>
                    <View style={styles.sectionHeadingCopy}>
                      <Text style={styles.sectionTitle}>Invitar a alguien</Text>
                      <Text style={styles.sectionSubtitle}>
                        El código caduca en 48 horas y funciona una sola vez.
                      </Text>
                    </View>
                  </View>
                  <SelectField
                    eyebrow="PERMISOS"
                    label="Qué podrá hacer"
                    onChange={setInvitationRole}
                    options={invitationRoleOptions}
                    placeholder="Selecciona un permiso"
                    title="Permiso de la invitación"
                    value={invitationRole}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={isWorking}
                    onPress={() => void handleCreateInvitation()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.primaryButtonPressed,
                      isWorking && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isWorking ? 'Creando…' : 'Crear código seguro'}
                    </Text>
                  </Pressable>

                  {createdInvitation ? (
                    <View style={styles.codeCard}>
                      <Text style={styles.codeEyebrow}>CÓDIGO DE UN SOLO USO</Text>
                      <Text selectable style={styles.code}>
                        {createdInvitation.code}
                      </Text>
                      <Text style={styles.codeExpiry}>
                        Caduca el {formatExpiry(createdInvitation.expiresAt)}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void handleShareInvitation()}
                        style={({ pressed }) => [
                          styles.shareButton,
                          pressed && styles.shareButtonPressed,
                        ]}
                      >
                        <Text style={styles.shareButtonText}>Compartir código</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {selectedFamily.invitations.length > 0 ? (
                    <View style={styles.pendingList}>
                      <Text style={styles.pendingTitle}>
                        Invitaciones pendientes
                      </Text>
                      {selectedFamily.invitations.map((invitation) => (
                        <View key={invitation.id} style={styles.pendingRow}>
                          <View style={styles.pendingCopy}>
                            <Text style={styles.pendingRole}>
                              {roleLabels[invitation.role]}
                            </Text>
                            <Text style={styles.pendingExpiry}>
                              Caduca el {formatExpiry(invitation.expiresAt)}
                            </Text>
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            disabled={isWorking}
                            onPress={() =>
                              void handleRevokeInvitation(invitation.id)
                            }
                            style={({ pressed }) => [
                              styles.revokeButton,
                              pressed && styles.revokeButtonPressed,
                            ]}
                          >
                            <Text style={styles.revokeButtonText}>Revocar</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => setShowJoinForm((visible) => !visible)}
                style={({ pressed }) => [
                  styles.joinAnotherButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
              >
                <Text style={styles.joinAnotherButtonText}>
                  {showJoinForm
                    ? 'Ocultar formulario'
                    : 'Tengo un código de otra familia'}
                </Text>
              </Pressable>
              {showJoinForm ? joinForm : null}
              {selectedBabyGroup && onFollowBaby && onRestoreBaby ? (
                <FamilyBabyManagement
                  family={selectedBabyGroup}
                  onFollowBaby={onFollowBaby}
                  onRestoreBaby={onRestoreBaby}
                />
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: {
    alignSelf: 'center',
    gap: spacing.xl,
    maxWidth: 720,
    paddingBottom: 64,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
  },
  hero: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: 32,
    minHeight: 220,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroCopy: { maxWidth: 390, zIndex: 2 },
  eyebrow: {
    color: colors.lavender,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 33, fontWeight: '900', letterSpacing: -1 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 330,
  },
  mascot: { alignSelf: 'flex-end', marginBottom: -18, marginRight: -8, marginTop: -28 },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionHeadingCopy: { flex: 1 },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  aquaIcon: { backgroundColor: colors.aquaSoft },
  butterIcon: { backgroundColor: colors.butterSoft },
  coralIcon: { backgroundColor: colors.peach },
  lavenderIcon: { backgroundColor: colors.lavenderSoft },
  sectionIconText: { color: colors.text, fontSize: 21, fontWeight: '900' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonPressed: { backgroundColor: colors.coralPressed },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 54,
  },
  secondaryButtonPressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
  secondaryButtonText: {
    color: colors.primaryPressed,
    fontSize: 15,
    fontWeight: '900',
  },
  buttonDisabled: { opacity: 0.55 },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  notice: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  noticeSuccess: { backgroundColor: colors.aquaSoft },
  noticeError: {
    backgroundColor: colors.peach,
    borderColor: colors.error,
    borderWidth: 1,
  },
  noticeMark: { color: colors.text, fontSize: 18, fontWeight: '900' },
  noticeText: { color: colors.text, flex: 1, fontSize: 13, lineHeight: 18 },
  familySelector: { gap: spacing.sm },
  familyChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  familyChipSelected: { backgroundColor: colors.aquaSoft, borderColor: colors.aqua },
  familyChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  familyChipTextSelected: { color: colors.primaryPressed },
  familySummary: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryEyebrow: {
    color: colors.primaryPressed,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  familyName: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 3 },
  familyRole: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  memberCount: { alignItems: 'center' },
  memberCountNumber: { color: colors.primaryPressed, fontSize: 30, fontWeight: '900' },
  memberCountLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  identityBar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  identityCopy: { flex: 1 },
  identityTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  identityText: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  identityButton: {
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  identityButtonText: {
    color: colors.primaryPressed,
    fontSize: 11,
    fontWeight: '900',
  },
  identityActions: { flexDirection: 'row', gap: spacing.md },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  cancelButtonText: { color: colors.textMuted, fontSize: 14, fontWeight: '900' },
  identitySaveButton: { flex: 2 },
  memberList: { gap: spacing.sm },
  memberRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  memberAvatar: {
    alignItems: 'center',
    backgroundColor: colors.butterSoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  memberAvatarText: { color: colors.text, fontSize: 17, fontWeight: '900' },
  memberCopy: { flex: 1 },
  memberName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  memberRelationship: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  removeMemberLink: {
    color: colors.error,
    fontSize: 11,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  roleBadge: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.pill,
    flexShrink: 0,
    maxWidth: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roleBadgeText: {
    color: colors.lavender,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  memberConfirmation: {
    backgroundColor: colors.peach,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  memberConfirmationTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  memberConfirmationText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  memberConfirmationActions: { flexDirection: 'row', gap: spacing.sm },
  memberConfirmationCancel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  memberConfirmationCancelText: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  memberConfirmationAccept: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  memberConfirmationAcceptText: { color: colors.white, fontWeight: '900' },
  invitationSection: { backgroundColor: colors.butterSoft },
  codeCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.coral,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 2,
    padding: spacing.xl,
  },
  codeEyebrow: {
    color: colors.coral,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  code: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: spacing.sm,
  },
  codeExpiry: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm },
  shareButton: {
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  shareButtonPressed: { opacity: 0.7 },
  shareButtonText: { color: colors.primaryPressed, fontSize: 12, fontWeight: '900' },
  pendingList: { gap: spacing.sm },
  pendingTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  pendingRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: spacing.md,
  },
  pendingCopy: { flex: 1 },
  pendingRole: { color: colors.text, fontSize: 13, fontWeight: '800' },
  pendingExpiry: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  revokeButton: {
    backgroundColor: colors.peach,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  revokeButtonPressed: { opacity: 0.68 },
  revokeButtonText: { color: colors.error, fontSize: 11, fontWeight: '900' },
  joinAnotherButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  joinAnotherButtonText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  stateScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 360,
    textAlign: 'center',
  },
  retryButton: { marginTop: spacing.md, minWidth: 220 },
});
