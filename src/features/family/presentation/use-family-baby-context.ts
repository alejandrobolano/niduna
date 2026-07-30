import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FamilyBabyContextRepository } from '@/features/family/application/family-baby-context-repository';
import {
  resolveFamilyBabySelection,
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
    const preferred = loadFamilyBabySelection(userId);

    void repository
      .load(userId)
      .then((loadedFamilies) => {
        if (!active) {
          return;
        }

        const resolvedSelection = resolveFamilyBabySelection(
          loadedFamilies,
          preferred,
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
  }, [repository, storeSelection, userId]);

  const activeFamily = useMemo(
    () => families.find((family) => family.id === selection?.familyId),
    [families, selection?.familyId],
  );
  const activeBaby = useMemo(
    () =>
      activeFamily?.babies.find((baby) => baby.id === selection?.babyId),
    [activeFamily, selection?.babyId],
  );

  function changeFamily(familyId: string) {
    const nextSelection = selectFamily(families, familyId);
    storeSelection(nextSelection);
  }

  function changeBaby(babyId: string) {
    if (!activeFamily?.babies.some((baby) => baby.id === babyId)) {
      return;
    }

    const nextSelection = {
      babyId,
      familyId: activeFamily.id,
    };
    storeSelection(nextSelection);
  }

  return {
    activeBaby,
    activeFamily,
    changeBaby,
    changeFamily,
    families,
    refresh,
    status,
  };
}
