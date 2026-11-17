import type { BabyDocument } from '@/features/baby-documents/domain/baby-document';
import { canWriteFamilyResources, type FamilyRole } from '../../family/domain/family';

export function canCreateBabyDocument(role: FamilyRole): boolean {
  return canWriteFamilyResources(role);
}

export function canManageBabyDocument(
  role: FamilyRole,
  userId: string,
  document: Pick<BabyDocument, 'authorUserId'>,
): boolean {
  return canWriteFamilyResources(role) && (
    role === 'owner' || role === 'admin' || document.authorUserId === userId
  );
}
