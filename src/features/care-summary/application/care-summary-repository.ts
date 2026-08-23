import type {
  DailyCareSummary,
  DailyCareSummaryRange,
} from '@/features/care-summary/domain/daily-care-summary';

export interface DailyCareSummaryQuery extends DailyCareSummaryRange {
  babyId: string;
}

export interface CareSummaryRepository {
  loadDaily(query: DailyCareSummaryQuery): Promise<DailyCareSummary>;
  subscribe(babyId: string, onChange: () => void): () => void;
}
