export const memberAvatarVariants = [
  'rabbit',
  'bear',
  'fox',
  'koala',
  'otter',
  'owl',
] as const;

export const babyAvatarVariants = ['chick', 'lamb', 'seal'] as const;

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

export function resolveMemberAvatar(seed: string): MemberAvatarVariant {
  return memberAvatarVariants[stableIndex(seed, memberAvatarVariants.length)];
}

export function resolveBabyAvatar(seed: string): BabyAvatarVariant {
  return babyAvatarVariants[stableIndex(seed, babyAvatarVariants.length)];
}
