import { Image } from 'expo-image';
import { Camera, Plus, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FamilyStoryError,
  type FamilyStoryRepository,
  type PreparedStoryImage,
} from '@/features/family-stories/application/family-story-repository';
import {
  formatStoryElapsedTime,
  groupFamilyStories,
  type FamilyStoryGroup,
} from '@/features/family-stories/domain/family-story';
import { pickAndPrepareStoryImage } from '@/features/family-stories/infrastructure/story-image-picker';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const storyDurationMilliseconds = 5_000;

interface FamilyStoriesStripProps {
  babyId: string;
  canPublish: boolean;
  repository: FamilyStoryRepository;
  userId: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof FamilyStoryError) {
    if (error.reason === 'invalid_image') {
      return 'Elige una foto válida. Niduna admite imágenes de hasta 15 MB.';
    }

    if (error.reason === 'not_allowed') {
      return 'Necesitamos permiso para acceder a tus fotos.';
    }
  }

  return 'No pudimos publicar la historia. Comprueba la conexión e inténtalo de nuevo.';
}

function StoryViewer({
  group,
  onClose,
  onRetire,
  onViewed,
  userId,
}: {
  group: FamilyStoryGroup;
  onClose: () => void;
  onRetire: (storyId: string) => Promise<void>;
  onViewed: (storyId: string) => Promise<void>;
  userId: string;
}) {
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isConfirmingRetire, setIsConfirmingRetire] = useState(false);
  const [isRetiring, setIsRetiring] = useState(false);
  const story = group.stories[storyIndex];

  useEffect(() => {
    if (!story.isViewed) {
      void onViewed(story.id);
    }
  }, [onViewed, story.id, story.isViewed]);

  useEffect(() => {
    if (isConfirmingRetire) {
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const nextProgress = Math.min(
        1,
        (Date.now() - startedAt) / storyDurationMilliseconds,
      );
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        clearInterval(timer);
        if (storyIndex < group.stories.length - 1) {
          setProgress(0);
          setStoryIndex((current) => current + 1);
        } else {
          onClose();
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [group.stories.length, isConfirmingRetire, onClose, storyIndex]);

  function goBack() {
    if (storyIndex > 0) {
      setProgress(0);
      setStoryIndex((current) => current - 1);
    }
  }

  function goForward() {
    if (storyIndex < group.stories.length - 1) {
      setProgress(0);
      setStoryIndex((current) => current + 1);
    } else {
      onClose();
    }
  }

  async function retireStory() {
    setIsRetiring(true);

    try {
      await onRetire(story.id);
      setIsConfirmingRetire(false);
    } catch {
      return;
    } finally {
      setIsRetiring(false);
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent visible>
      <SafeAreaView style={styles.viewer}>
        <Image cachePolicy="memory" contentFit="contain" source={story.imageUrl} style={styles.viewerImage} />
        <View style={styles.progressRow}>
          {group.stories.map((candidate, index) => (
            <View key={candidate.id} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${index < storyIndex ? 100 : index === storyIndex ? progress * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.viewerHeader}>
          <View style={styles.viewerAuthorBadge}>
            <Image cachePolicy="memory" contentFit="cover" source={story.imageUrl} style={styles.viewerAuthorImage} />
          </View>
          <View style={styles.viewerAuthorCopy}>
            <Text style={styles.viewerAuthorName}>{group.author.displayName}</Text>
            <Text style={styles.viewerTime}>{formatStoryElapsedTime(story.createdAt)}</Text>
          </View>
          {group.author.id === userId ? (
            <Pressable
              accessibilityLabel="Retirar historia"
              onPress={() => setIsConfirmingRetire(true)}
              style={styles.viewerIconButton}
            >
              <Trash2 color={colors.white} size={20} />
            </Pressable>
          ) : null}
          <Pressable accessibilityLabel="Cerrar historias" onPress={onClose} style={styles.viewerIconButton}>
            <X color={colors.white} size={24} />
          </Pressable>
        </View>
        <View pointerEvents="box-none" style={styles.viewerNavigation}>
          <Pressable accessibilityLabel="Historia anterior" onPress={goBack} style={styles.viewerHalf} />
          <Pressable accessibilityLabel="Historia siguiente" onPress={goForward} style={styles.viewerHalf} />
        </View>
        <View style={styles.screenshotNotice}>
          <ShieldCheck color={colors.white} size={15} />
          <Text style={styles.screenshotNoticeText}>Solo tu familia puede verla, pero no podemos impedir capturas de pantalla.</Text>
        </View>
        {isConfirmingRetire ? (
          <View accessibilityViewIsModal style={styles.confirmationOverlay}>
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationIcon}>
                <Trash2 color={colors.error} size={23} />
              </View>
              <Text style={styles.confirmationTitle}>¿Retirar esta historia?</Text>
              <Text style={styles.confirmationCopy}>
                La foto dejará de estar visible inmediatamente para toda la familia.
              </Text>
              <View style={styles.confirmationActions}>
                <Pressable
                  disabled={isRetiring}
                  onPress={() => setIsConfirmingRetire(false)}
                  style={[styles.confirmationButton, styles.confirmationCancelButton]}
                >
                  <Text style={styles.confirmationCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  disabled={isRetiring}
                  onPress={() => void retireStory()}
                  style={[styles.confirmationButton, styles.confirmationRetireButton]}
                >
                  {isRetiring ? (
                    <ActivityIndicator color={colors.onAccent} />
                  ) : (
                    <Text style={styles.confirmationRetireText}>Retirar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

export function FamilyStoriesStrip({
  babyId,
  canPublish,
  repository,
  userId,
}: FamilyStoriesStripProps) {
  const [stories, setStories] = useState<Awaited<ReturnType<FamilyStoryRepository['load']>>>([]);
  const [selectedGroup, setSelectedGroup] = useState<FamilyStoryGroup>();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<PreparedStoryImage>();
  const [error, setError] = useState<string>();
  const loadPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const viewedStoryIdsRef = useRef(new Set<string>());
  const groups = useMemo(() => groupFamilyStories(stories), [stories]);

  const loadStories = useCallback(() => {
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    const request = repository.load(babyId, userId)
      .then((loaded) => {
        loaded.forEach((story) => {
          if (story.isViewed) {
            viewedStoryIdsRef.current.add(story.id);
          }
        });
        setStories(loaded);
        setError(undefined);
      })
      .catch(() => {
        setError('No pudimos cargar las historias familiares.');
      })
      .finally(() => {
        loadPromiseRef.current = undefined;
        setIsLoading(false);
      });

    loadPromiseRef.current = request;
    return request;
  }, [babyId, repository, userId]);

  useEffect(() => {
    const initialLoadTimer = setTimeout(() => void loadStories(), 0);
    let realtimeTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = repository.subscribe(babyId, () => {
      clearTimeout(realtimeTimer);
      realtimeTimer = setTimeout(() => void loadStories(), 150);
    });
    const signedUrlRefreshTimer = setInterval(() => void loadStories(), 4 * 60_000);

    return () => {
      clearInterval(signedUrlRefreshTimer);
      clearTimeout(realtimeTimer);
      clearTimeout(initialLoadTimer);
      unsubscribe();
    };
  }, [babyId, loadStories, repository]);

  useEffect(() => {
    const nextExpiry = stories.reduce(
      (nearest, story) => Math.min(nearest, Date.parse(story.expiresAt)),
      Number.POSITIVE_INFINITY,
    );

    if (!Number.isFinite(nextExpiry)) {
      return;
    }

    const timer = setTimeout(() => {
      const now = Date.now();
      setStories((current) =>
        current.filter((story) => Date.parse(story.expiresAt) > now),
      );
      setSelectedGroup(undefined);
    }, Math.max(0, nextExpiry - Date.now()) + 25);

    return () => clearTimeout(timer);
  }, [stories]);

  async function uploadStory(image: PreparedStoryImage) {
    setIsUploading(true);

    try {
      await repository.create(babyId, image);
      setPendingImage(undefined);
      await loadStories();
    } catch (caughtError) {
      setPendingImage(image);
      setError(getErrorMessage(caughtError));
    } finally {
      setIsUploading(false);
    }
  }

  async function publishStory() {
    setError(undefined);

    try {
      const image = await pickAndPrepareStoryImage();
      if (!image) {
        return;
      }

      await uploadStory(image);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  const markViewed = useCallback(async (storyId: string) => {
    if (viewedStoryIdsRef.current.has(storyId)) {
      return;
    }

    viewedStoryIdsRef.current.add(storyId);

    try {
      await repository.markViewed(storyId);
      setStories((current) =>
        current.map((story) => story.id === storyId ? { ...story, isViewed: true } : story),
      );
    } catch {
      viewedStoryIdsRef.current.delete(storyId);
      setError('No pudimos guardar que ya viste esta historia.');
    }
  }, [repository]);

  const closeViewer = useCallback(() => setSelectedGroup(undefined), []);

  async function retire(storyId: string) {
    try {
      await repository.retire(storyId);
      setSelectedGroup(undefined);
      await loadStories();
    } catch (caughtError) {
      setError('No pudimos retirar la historia.');
      throw caughtError;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.eyebrow}>Momentos de hoy</Text>
          <Text style={styles.title}>Historias de la familia</Text>
        </View>
        {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      </View>
      <ScrollView contentContainerStyle={styles.bubbles} horizontal showsHorizontalScrollIndicator={false}>
        {canPublish ? (
          <Pressable disabled={isUploading} onPress={() => void publishStory()} style={styles.bubbleAction}>
            <View style={[styles.avatar, styles.addAvatar]}>
              {isUploading ? <ActivityIndicator color={colors.primaryPressed} /> : <Camera color={colors.primaryPressed} size={22} />}
              {!isUploading ? <View style={styles.plusBadge}><Plus color={colors.onAccent} size={12} /></View> : null}
            </View>
            <Text numberOfLines={1} style={styles.bubbleLabel}>{isUploading ? 'Publicando…' : 'Tu historia'}</Text>
          </Pressable>
        ) : null}
        {groups.map((group) => (
          <Pressable key={group.author.id} onPress={() => setSelectedGroup(group)} style={styles.bubbleAction}>
            <View style={[styles.storyRing, group.hasUnseenStories ? styles.unseenRing : styles.seenRing]}>
              <View style={styles.avatar}>
                <Image
                  cachePolicy="memory"
                  contentFit="cover"
                  source={group.stories.at(-1)?.imageUrl}
                  style={styles.avatarImage}
                />
              </View>
            </View>
            <Text numberOfLines={1} style={styles.bubbleLabel}>{group.author.id === userId ? 'Tú' : group.author.displayName}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityLabel="Reintentar"
            disabled={isUploading}
            onPress={() => pendingImage ? void uploadStory(pendingImage) : void loadStories()}
          >
            <RefreshCw color={colors.error} size={17} />
          </Pressable>
        </View>
      ) : null}
      {selectedGroup ? (
        <StoryViewer
          group={selectedGroup}
          onClose={closeViewer}
          onRetire={retire}
          onViewed={markViewed}
          userId={userId}
        />
      ) : null}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: colors.primaryPressed, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 2 },
  bubbles: { gap: spacing.md, paddingRight: spacing.md },
  bubbleAction: { alignItems: 'center', gap: spacing.xs, width: 72 },
  storyRing: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 3, height: 62, justifyContent: 'center', width: 62 },
  unseenRing: { borderColor: colors.coral },
  seenRing: { borderColor: colors.border },
  avatar: { alignItems: 'center', backgroundColor: colors.lavenderSoft, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 2, height: 54, justifyContent: 'center', width: 54 },
  addAvatar: { backgroundColor: colors.aquaSoft, borderColor: colors.primary, borderStyle: 'dashed' },
  plusBadge: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: radius.pill, bottom: -2, height: 20, justifyContent: 'center', position: 'absolute', right: -2, width: 20 },
  bubbleLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', maxWidth: 72 },
  errorRow: { alignItems: 'center', backgroundColor: colors.errorSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', padding: spacing.md },
  errorText: { color: colors.error, flex: 1, fontSize: 12, fontWeight: '700' },
  viewer: { backgroundColor: '#111522', flex: 1 },
  viewerImage: { height: '100%', width: '100%' },
  progressRow: { flexDirection: 'row', gap: 4, left: spacing.md, position: 'absolute', right: spacing.md, top: spacing.sm },
  progressTrack: { backgroundColor: '#FFFFFF55', borderRadius: radius.pill, flex: 1, height: 3, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.white, height: '100%' },
  viewerHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, left: spacing.md, position: 'absolute', right: spacing.md, top: spacing.xl },
  viewerAuthorBadge: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: radius.pill, height: 38, justifyContent: 'center', width: 38 },
  viewerAuthorImage: { borderRadius: radius.pill, height: '100%', width: '100%' },
  viewerAuthorCopy: { flex: 1 },
  viewerAuthorName: { color: colors.white, fontSize: 14, fontWeight: '900' },
  viewerTime: { color: '#FFFFFFBB', fontSize: 11, fontWeight: '700' },
  viewerIconButton: { alignItems: 'center', backgroundColor: '#00000055', borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  viewerNavigation: { bottom: 70, flexDirection: 'row', left: 0, position: 'absolute', right: 0, top: 84 },
  viewerHalf: { flex: 1 },
  screenshotNotice: { alignItems: 'center', backgroundColor: '#00000088', borderRadius: radius.pill, bottom: spacing.lg, flexDirection: 'row', gap: spacing.sm, left: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, position: 'absolute', right: spacing.lg },
  screenshotNoticeText: { color: colors.white, flex: 1, fontSize: 10, lineHeight: 14 },
  confirmationOverlay: { alignItems: 'center', backgroundColor: '#070A12CC', bottom: 0, justifyContent: 'center', left: 0, padding: spacing.xl, position: 'absolute', right: 0, top: 0 },
  confirmationCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.md, maxWidth: 420, padding: spacing.xl, width: '100%' },
  confirmationIcon: { alignItems: 'center', backgroundColor: colors.errorSoft, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  confirmationTitle: { color: colors.text, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  confirmationCopy: { color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  confirmationActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, width: '100%' },
  confirmationButton: { alignItems: 'center', borderRadius: radius.md, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  confirmationCancelButton: { backgroundColor: colors.background },
  confirmationRetireButton: { backgroundColor: colors.error },
  confirmationCancelText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  confirmationRetireText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' },
  avatarImage: { borderRadius: radius.pill, height: '100%', width: '100%' },
}));
