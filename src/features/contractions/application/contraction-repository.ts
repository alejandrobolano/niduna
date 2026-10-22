import type { Contraction } from '@/features/contractions/domain/contraction';

export type ContractionErrorReason =
  | 'already_active'
  | 'not_allowed'
  | 'unavailable';

export class ContractionError extends Error {
  constructor(public readonly reason: ContractionErrorReason) {
    super(`contraction_${reason}`);
    this.name = 'ContractionError';
  }
}

export interface ContractionRepository {
  finish(contractionId: string): Promise<void>;
  loadRecent(babyId: string): Promise<Contraction[]>;
  remove(contractionId: string): Promise<void>;
  start(babyId: string): Promise<string>;
  subscribe(babyId: string, onChange: () => void): () => void;
}
