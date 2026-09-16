import type {
  CareSummaryReport,
  DailyCareSummaryRange,
} from '@/features/care-summary/domain/daily-care-summary';

export interface DailyCareSummaryQuery extends DailyCareSummaryRange {
  babyId: string;
}

export interface CareSummaryRepository {
  loadReport(query: DailyCareSummaryQuery): Promise<CareSummaryReport>;
  loadSummary(query: DailyCareSummaryQuery): Promise<CareSummaryReport['summary']>;
  subscribe(babyId: string, onChange: () => void): () => void;
}
