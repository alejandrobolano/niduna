import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { FeedingVolumePreferenceRepository } from '../application/feeding-volume-preference-repository';
import type { FeedingVolumeUnit } from '../domain/feeding-volume';

interface FeedingVolumePreferenceContextValue {
  isSaving: boolean;
  setUnit(unit: FeedingVolumeUnit): Promise<void>;
  unit: FeedingVolumeUnit;
}

const FeedingVolumePreferenceContext =
  createContext<FeedingVolumePreferenceContextValue | undefined>(undefined);

export function FeedingVolumePreferenceProvider({
  children,
  repository,
  userId,
}: {
  children: ReactNode;
  repository: FeedingVolumePreferenceRepository;
  userId?: string;
}) {
  const [unit, setUnitState] = useState<FeedingVolumeUnit>('ml');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!userId) return () => { active = false; };

    void repository.load(userId).then((loadedUnit) => {
      if (active) setUnitState(loadedUnit);
    }).catch(() => undefined);

    return () => { active = false; };
  }, [repository, userId]);

  const value = useMemo<FeedingVolumePreferenceContextValue>(() => ({
    isSaving,
    async setUnit(nextUnit) {
      if (!userId || nextUnit === unit) return;
      const previousUnit = unit;
      setUnitState(nextUnit);
      setIsSaving(true);
      try {
        await repository.save(userId, nextUnit);
      } catch (error) {
        setUnitState(previousUnit);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    unit,
  }), [isSaving, repository, unit, userId]);

  return (
    <FeedingVolumePreferenceContext.Provider value={value}>
      {children}
    </FeedingVolumePreferenceContext.Provider>
  );
}

export function useFeedingVolumePreference() {
  const context = useContext(FeedingVolumePreferenceContext);
  if (!context) {
    throw new Error('useFeedingVolumePreference must be used within FeedingVolumePreferenceProvider');
  }
  return context;
}
