import type {
  BreastSide,
  CareDashboard,
  CareEvent,
  DiaperCondition,
  FeedingMethod,
  MeasurementSource,
} from '@/features/care/domain/care-event';
import type {
  CareEventFilter,
  CareHistoryPageSize,
} from '@/features/care/application/care-history';

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

export interface CareHistoryQuery {
  babyId: string;
  date?: string;
  filter: CareEventFilter;
  page: number;
  pageSize: CareHistoryPageSize;
}

export interface CareHistoryPage {
  events: CareEvent[];
  page: number;
  pageSize: CareHistoryPageSize;
  total: number;
  totalPages: number;
}

export interface CareRepository {
  finishSleep(eventId: string): Promise<void>;
  loadHistory(query: CareHistoryQuery): Promise<CareHistoryPage>;
  loadRetiredHistory(query: CareHistoryQuery): Promise<CareHistoryPage>;
  loadHistoryForExport(
    query: Omit<CareHistoryQuery, 'page' | 'pageSize'>,
  ): Promise<CareEvent[]>;
  load(userId: string, babyId: string): Promise<CareDashboard | null>;
  recordDiaper(input: DiaperInput): Promise<void>;
  recordFeeding(input: FeedingInput): Promise<void>;
  recordMeasurement(input: MeasurementInput): Promise<void>;
  recordNote(input: NoteInput): Promise<void>;
  restoreEvent(event: CareEvent): Promise<void>;
  retireEvents(events: CareEvent[]): Promise<void>;
  startSleep(input: SleepInput): Promise<void>;
  subscribe(babyId: string, onChange: () => void): () => void;
  updateEvent(event: CareEvent): Promise<void>;
}

export type CareOperationErrorReason =
  | 'not_allowed'
  | 'recovery_expired'
  | 'sleep_already_running'
  | 'unknown';

export class CareOperationError extends Error {
  constructor(readonly reason: CareOperationErrorReason) {
    super(`care_operation_${reason}`);
    this.name = 'CareOperationError';
  }
}
