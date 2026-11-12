import { canWriteFamilyResources, type FamilyRole } from '../../family/domain/family';

export function canCreateBabyContact(role: FamilyRole): boolean {
  return canWriteFamilyResources(role);
}

export function canManageBabyContact(
  authorUserId: string | undefined,
  currentUserId: string,
  familyRole: FamilyRole,
): boolean {
  return canWriteFamilyResources(familyRole) && (
    authorUserId === currentUserId || familyRole === 'owner' || familyRole === 'admin'
  );
}
