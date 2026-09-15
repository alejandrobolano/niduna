import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FamilyBabyContextRepository } from '@/features/family/application/family-baby-context-repository';
import {
  resolveFamilyBabySelection,
  selectBaby,
  selectFamily,
} from '@/features/family/application/family-baby-selection';
import type {
  FamilyBabyGroup,
  FamilyBabySelection,
} from '@/features/family/domain/family-baby-context';
import {
  loadFamilyBabySelection,
  saveFamilyBabySelection,
} from '@/features/family/infrastructure/family-baby-selection-storage';

type ContextStatus = 'error' | 'loading' | 'ready';

export function useFamilyBabyContext(
  repository: FamilyBabyContextRepository,
  userId: string,
  preferredBabyId?: string,
) {
  const [families, setFamilies] = useState<FamilyBabyGroup[]>([]);
  const [selection, setSelection] = useState<FamilyBabySelection>();
  const [status, setStatus] = useState<ContextStatus>('loading');
  const selectionRef = useRef<FamilyBabySelection | undefined>(undefined);

  const storeSelection = useCallback(
    (nextSelection: FamilyBabySelection | undefined) => {
      selectionRef.current = nextSelection;
      setSelection(nextSelection);
      saveFamilyBabySelection(userId, nextSelection);
    },
    [userId],
  );

  const refresh = useCallback(
    async (preferred?: FamilyBabySelection) => {
      try {
        const loadedFamilies = await repository.load(userId);
        const resolvedSelection = resolveFamilyBabySelection(
          loadedFamilies,
          preferred ??
            selectionRef.current ??
            loadFamilyBabySelection(userId),
        );

        setFamilies(loadedFamilies);
        storeSelection(resolvedSelection);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [repository, storeSelection, userId],
  );

  useEffect(() => {
    let active = true;
    const storedSelection = loadFamilyBabySelection(userId);

    void repository
      .load(userId)
      .then((loadedFamilies) => {
        if (!active) {
          return;
        }

        const resolvedSelection = resolveFamilyBabySelection(
          loadedFamilies,
          (preferredBabyId
            ? selectBaby(loadedFamilies, preferredBabyId)
            : undefined) ?? storedSelection,
        );
        setFamilies(loadedFamilies);
        storeSelection(resolvedSelection);
        setStatus('ready');
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [preferredBabyId, repository, storeSelection, userId]);

  const activeFamily = useMemo(
    () => families.find((family) => family.id === selection?.familyId),
    [families, selection?.familyId],
  );
  const activeBaby = useMemo(
    () =>
      activeFamily?.babies.find((baby) => baby.id === selection?.babyId),
    [activeFamily, selection?.babyId],
  );

  const changeFamily = useCallback((familyId: string) => {
    const nextSelection = selectFamily(families, familyId);
    storeSelection(nextSelection);
  }, [families, storeSelection]);

  const changeBaby = useCallback((babyId: string) => {
    const nextSelection = selectBaby(families, babyId);

    if (nextSelection) {
      storeSelection(nextSelection);
    }
  }, [families, storeSelection]);

  async function archiveBaby(babyId: string) {
    await repository.archiveBaby(babyId);
    await refresh();
  }

  async function followBaby(babyId: string) {
    const familyId = activeFamily?.id;
    await repository.followBaby(babyId);
    await refresh(familyId ? { babyId, familyId } : undefined);
  }

  async function restoreBaby(babyId: string) {
    const familyId = activeFamily?.id;
    await repository.restoreBaby(babyId);
    await refresh(familyId ? { babyId, familyId } : undefined);
  }

  async function unfollowBaby(babyId: string) {
    await repository.unfollowBaby(babyId);
    await refresh();
  }

  return {
    activeBaby,
    activeFamily,
    archiveBaby,
    changeBaby,
    changeFamily,
    families,
    followBaby,
    refresh,
    restoreBaby,
    status,
    unfollowBaby,
  };
}
