import { Pencil } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ProfileAvatarRepository } from '@/features/avatars/application/profile-avatar-repository';
import { memberAvatarVariants, resolveMemberAvatar, type MemberAvatarVariant } from '@/features/avatars/domain/avatar';
import { AvatarImagePickerError, pickAndPrepareAvatarImage } from '@/features/avatars/infrastructure/avatar-image-picker';
import { AnimalAvatar } from '@/features/avatars/presentation/animal-avatar';
import { AvatarPickerModal } from '@/features/avatars/presentation/avatar-picker-modal';
import type { FamilyRelationship } from '@/features/family/domain/family';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface ProfileAvatarEditorProps {
  email: string;
  relationship?: FamilyRelationship;
  repository: ProfileAvatarRepository;
  userId: string;
}

export function ProfileAvatarEditor({ email, relationship, repository, userId }: ProfileAvatarEditorProps) {
  const [avatarKey, setAvatarKey] = useState<MemberAvatarVariant>();
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState<string>();
  const resolvedAvatar = resolveMemberAvatar(avatarKey, relationship);

  useEffect(() => {
    let active = true;
    void repository.load(userId).then((avatar) => {
      if (active) {
        setAvatarKey(avatar.avatarKey);
        setPhotoUrl(avatar.photoUrl);
      }
    }).catch(() => {
      if (active) setError('No pudimos cargar tu avatar.');
    });
    return () => { active = false; };
  }, [repository, userId]);

  async function selectAnimal(nextAvatar: MemberAvatarVariant) {
    setError(undefined);
    try {
      await repository.saveAnimal(userId, nextAvatar);
      setAvatarKey(nextAvatar);
    } catch {
      setError('No pudimos guardar el animalito. Inténtalo de nuevo.');
    }
  }

  async function pickPhoto() {
    setError(undefined);
    try {
      const image = await pickAndPrepareAvatarImage();
      if (!image) return;
      setPhotoUrl(await repository.replacePhoto(userId, image));
    } catch (caught) {
      setError(caught instanceof AvatarImagePickerError && caught.code === 'not_allowed'
        ? 'Necesitamos permiso para acceder a tus fotos.'
        : 'No pudimos guardar la foto. Inténtalo de nuevo.');
    }
  }

  async function removePhoto() {
    setError(undefined);
    try {
      await repository.removePhoto(userId);
      setPhotoUrl(undefined);
    } catch {
      setError('No pudimos retirar la foto. Inténtalo de nuevo.');
    }
  }

  return (
    <>
      <View style={styles.identity}>
        <Pressable accessibilityHint="Abre el selector de avatar" accessibilityLabel="Cambiar tu avatar" accessibilityRole="button" onPress={() => setIsPickerOpen(true)} style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}>
          <AnimalAvatar accessibilityLabel="Tu avatar" photoUrl={photoUrl} size={64} variant={resolvedAvatar} />
          <View style={styles.editBadge}><Pencil color={colors.onAccent} size={13} /></View>
        </Pressable>
        <View style={styles.copy}>
          <Text numberOfLines={2} style={styles.email}>{email}</Text>
          <Text style={styles.caption}>Toca tu avatar para elegir un animalito o una foto.</Text>
        </View>
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <AvatarPickerModal
        current={resolvedAvatar}
        hasPhoto={Boolean(photoUrl)}
        onClose={() => setIsPickerOpen(false)}
        onPickPhoto={pickPhoto}
        onRemovePhoto={removePhoto}
        onSelect={selectAnimal}
        title="Elige tu animalito"
        variants={memberAvatarVariants}
        visible={isPickerOpen}
      />
    </>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  identity: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  avatarButton: { borderRadius: radius.pill, position: 'relative' },
  editBadge: { alignItems: 'center', backgroundColor: colors.coral, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 2, bottom: -2, height: 25, justifyContent: 'center', position: 'absolute', right: -2, width: 25 },
  copy: { flex: 1 },
  email: { color: colors.text, fontSize: 14, fontWeight: '900' },
  caption: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.xs },
  error: { color: colors.error, fontSize: 12 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
}));
