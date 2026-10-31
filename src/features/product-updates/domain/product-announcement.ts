export type ProductAnnouncementRoute =
  | 'handoff'
  | 'history'
  | 'baby'
  | 'family'
  | 'medications';

export interface ProductAnnouncement {
  actionLabel?: string;
  description: string;
  id: string;
  targetRoute?: ProductAnnouncementRoute;
  title: string;
}

export function isVersionAtLeast(current: string, minimum: string): boolean {
  const currentParts = current.split('.').map(Number);
  const minimumParts = minimum.split('.').map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = (currentParts[index] ?? 0) - (minimumParts[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }

  return true;
}
