import type { SexAtBirth } from '@/features/baby-profile/domain/baby-profile';
import type { FamilyRelationship } from '@/features/family/domain/family';

export const memberAvatarVariants = [
  'rabbit',
  'bear',
  'fox',
  'koala',
  'otter',
  'owl',
] as const;

export const babyAvatarVariants = [
  'chick',
  'lamb',
  'seal',
  'rabbit',
  'bear',
  'fox',
  'koala',
  'otter',
  'owl',
] as const;

export type MemberAvatarVariant = (typeof memberAvatarVariants)[number];
export type BabyAvatarVariant = (typeof babyAvatarVariants)[number];
export type AnimalAvatarVariant = MemberAvatarVariant | BabyAvatarVariant;

function stableIndex(seed: string, length: number): number {
  let hash = 2166136261;

  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % length;
}

const defaultMemberAvatarByRelationship: Record<FamilyRelationship, MemberAvatarVariant> = {
  mother: 'rabbit',
  father: 'bear',
  parent: 'fox',
  guardian: 'owl',
  grandparent: 'koala',
  relative: 'otter',
  professional_caregiver: 'fox',
  other: 'owl',
};

const defaultBabyAvatarBySex: Record<SexAtBirth, BabyAvatarVariant> = {
  female: 'lamb',
  male: 'chick',
  intersex: 'seal',
  unknown: 'seal',
};

export function getDefaultMemberAvatar(
  relationship?: FamilyRelationship,
): MemberAvatarVariant {
  return relationship ? defaultMemberAvatarByRelationship[relationship] : 'owl';
}

export function getDefaultBabyAvatar(sexAtBirth?: SexAtBirth): BabyAvatarVariant {
  return sexAtBirth ? defaultBabyAvatarBySex[sexAtBirth] : 'seal';
}

export function resolveMemberAvatar(
  selectedAvatar?: MemberAvatarVariant,
  relationship?: FamilyRelationship,
): MemberAvatarVariant {
  return selectedAvatar ?? getDefaultMemberAvatar(relationship);
}

export function resolveBabyAvatar(
  selectedAvatar?: BabyAvatarVariant,
  sexAtBirth?: SexAtBirth,
): BabyAvatarVariant {
  return selectedAvatar ?? getDefaultBabyAvatar(sexAtBirth);
}

export function resolveStableMemberAvatar(seed: string): MemberAvatarVariant {
  return memberAvatarVariants[stableIndex(seed, memberAvatarVariants.length)];
}

export function resolveStableBabyAvatar(seed: string): BabyAvatarVariant {
  return babyAvatarVariants[stableIndex(seed, babyAvatarVariants.length)];
}
