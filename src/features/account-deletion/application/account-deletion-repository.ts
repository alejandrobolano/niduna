export type AccountDeletionErrorReason =
  | 'network'
  | 'owner_transfer_required'
  | 'unexpected';

export class AccountDeletionError extends Error {
  readonly reason: AccountDeletionErrorReason;

  constructor(reason: AccountDeletionErrorReason) {
    super(reason);
    this.name = 'AccountDeletionError';
    this.reason = reason;
  }
}

export interface DeleteAccountOptions {
  deleteOwnedFamilies?: boolean;
}

export interface AccountDeletionRepository {
  deleteAccount(options?: DeleteAccountOptions): Promise<void>;
}
