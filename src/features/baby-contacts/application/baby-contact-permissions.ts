import type { FamilyRole } from '@/features/family/domain/family';

export function canManageBabyContact(
  authorUserId: string | undefined,
  currentUserId: string,
  familyRole: FamilyRole,
): boolean {
  return authorUserId === currentUserId || familyRole === 'owner' || familyRole === 'admin';
}
