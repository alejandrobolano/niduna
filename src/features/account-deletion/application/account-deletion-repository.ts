export type AccountDeletionErrorReason =
  | 'network'
  | 'owner_transfer_required'
  | 'recent_authentication_required'
  | 'unexpected';

export class AccountDeletionError extends Error {
  readonly reason: AccountDeletionErrorReason;

  constructor(reason: AccountDeletionErrorReason) {
    super(reason);
    this.name = 'AccountDeletionError';
    this.reason = reason;
  }
}

export interface AccountDeletionRepository {
  deleteAccount(): Promise<void>;
}
