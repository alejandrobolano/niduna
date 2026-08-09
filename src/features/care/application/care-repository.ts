import type {
  BreastSide,
  CareDashboard,
  DiaperCondition,
  FeedingMethod,
  MeasurementSource,
} from '@/features/care/domain/care-event';

interface CareEventInput {
  babyId: string;
  notes?: string;
}

export interface FeedingInput extends CareEventInput {
  amountMilliliters?: number;
  breastSide?: BreastSide;
  method: FeedingMethod;
}

export interface DiaperInput extends CareEventInput {
  condition: DiaperCondition;
}

export type SleepInput = CareEventInput;

export interface NoteInput {
  babyId: string;
  content: string;
}

export interface MeasurementInput extends CareEventInput {
  headCircumferenceMillimeters?: number;
  lengthMillimeters?: number;
  source: MeasurementSource;
  weightGrams?: number;
}

export interface CareRepository {
  finishSleep(eventId: string): Promise<void>;
  load(userId: string, babyId: string): Promise<CareDashboard | null>;
  recordDiaper(input: DiaperInput): Promise<void>;
  recordFeeding(input: FeedingInput): Promise<void>;
  recordMeasurement(input: MeasurementInput): Promise<void>;
  recordNote(input: NoteInput): Promise<void>;
  startSleep(input: SleepInput): Promise<void>;
  subscribe(babyId: string, onChange: () => void): () => void;
}

export type CareOperationErrorReason =
  | 'not_allowed'
  | 'sleep_already_running'
  | 'unknown';

export class CareOperationError extends Error {
  constructor(readonly reason: CareOperationErrorReason) {
    super(`care_operation_${reason}`);
    this.name = 'CareOperationError';
  }
}
