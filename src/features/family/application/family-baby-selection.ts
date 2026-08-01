import type {
  FamilyBabyGroup,
  FamilyBabySelection,
} from '@/features/family/domain/family-baby-context';

export function resolveFamilyBabySelection(
  families: FamilyBabyGroup[],
  preferred?: FamilyBabySelection,
): FamilyBabySelection | undefined {
  const family =
    families.find((candidate) => candidate.id === preferred?.familyId) ??
    families[0];

  if (!family) {
    return undefined;
  }

  const baby =
    family.babies.find((candidate) => candidate.id === preferred?.babyId) ??
    family.babies[0];

  return {
    babyId: baby?.id,
    familyId: family.id,
  };
}

export function selectFamily(
  families: FamilyBabyGroup[],
  familyId: string,
): FamilyBabySelection | undefined {
  const family = families.find((candidate) => candidate.id === familyId);

  if (!family) {
    return undefined;
  }

  return {
    babyId: family.babies[0]?.id,
    familyId: family.id,
  };
}
