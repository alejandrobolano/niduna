import type { BabyDocument } from '@/features/baby-documents/domain/baby-document';
import type { FamilyRole } from '@/features/family/domain/family';

export function canManageBabyDocument(
  role: FamilyRole,
  userId: string,
  document: Pick<BabyDocument, 'authorUserId'>,
): boolean {
  return role === 'owner' || role === 'admin' || document.authorUserId === userId;
}
