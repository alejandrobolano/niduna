import type { BabyLifeStage } from '@/features/baby-profile/domain/baby-profile';
import { type LucideIcon } from 'lucide-react-native';

export type FeedingMethod =
  | 'breast'
  | 'expressed_milk'
  | 'formula'
  | 'mixed';

export type BreastSide = 'left' | 'right' | 'both';

export type DiaperCondition = 'wet' | 'dirty' | 'both';

interface BaseCareEvent {
  babyId: string;
  id: string;
  notes?: string;
  occurredAt: string;
  recordedByName?: string;
}

export interface FeedingEvent extends BaseCareEvent {
  amountMilliliters?: number;
  breastSide?: BreastSide;
  icon: LucideIcon;
  method: FeedingMethod;
  type: 'feeding';
}

export interface DiaperEvent extends BaseCareEvent {
  condition: DiaperCondition;
  icon: LucideIcon;
  type: 'diaper';
}

export interface SleepEvent extends BaseCareEvent {
  endedAt?: string;
  icon: LucideIcon;
  type: 'sleep';
}

export type CareEvent = FeedingEvent | DiaperEvent | SleepEvent;

export interface CareBaby {
  id: string;
  lifeStage: BabyLifeStage;
  name: string;
}

export interface CareDashboard {
  baby: CareBaby;
  canRecord: boolean;
  events: CareEvent[];
  hasOlderEvents: boolean;
}
