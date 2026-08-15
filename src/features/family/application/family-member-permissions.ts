import type { FamilyMember, FamilyRole } from '@/features/family/domain/family';

export function canRemoveFamilyMember(
  actorRole: FamilyRole,
  target: Pick<FamilyMember, 'isCurrentUser' | 'role'>,
): boolean {
  if (target.isCurrentUser || target.role === 'owner') {
    return false;
  }

  if (actorRole === 'owner') {
    return true;
  }

  return (
    actorRole === 'admin' &&
    (target.role === 'caregiver' || target.role === 'viewer')
  );
}

export function canTransferFamilyOwnership(
  actorRole: FamilyRole,
  target: Pick<FamilyMember, 'isCurrentUser' | 'role'>,
): boolean {
  return (
    actorRole === 'owner' &&
    !target.isCurrentUser &&
    target.role !== 'owner'
  );
}
