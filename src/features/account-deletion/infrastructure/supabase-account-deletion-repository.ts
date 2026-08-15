import {
  AccountDeletionError,
  type AccountDeletionErrorReason,
  type AccountDeletionRepository,
  type DeleteAccountOptions,
} from '@/features/account-deletion/application/account-deletion-repository';
import { supabase } from '@/shared/infrastructure/supabase/client';

function mapReason(value: unknown): AccountDeletionErrorReason {
  if (value === 'account_owns_family') {
    return 'owner_transfer_required';
  }

  if (value === 'recent_authentication_required') {
    return 'recent_authentication_required';
  }

  return 'unexpected';
}

async function readFunctionError(error: unknown): Promise<AccountDeletionError> {
  if (error instanceof TypeError) {
    return new AccountDeletionError('network');
  }

  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = (await context.json()) as { error?: unknown };
      return new AccountDeletionError(mapReason(body.error));
    } catch {
      return new AccountDeletionError('unexpected');
    }
  }

  return new AccountDeletionError('unexpected');
}

export const supabaseAccountDeletionRepository: AccountDeletionRepository = {
  async deleteAccount(options: DeleteAccountOptions = {}) {
    const { error } = await supabase.functions.invoke('delete-account', {
      body: { deleteOwnedFamilies: options.deleteOwnedFamilies === true },
    });

    if (error) {
      throw await readFunctionError(error);
    }
  },
};
