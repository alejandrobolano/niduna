import type { BabyLifeStage } from '@/features/baby-profile/domain/baby-profile';
import { type LucideIcon } from 'lucide-react-native';

export type FeedingMethod =
  | 'breast'
  | 'expressed_milk'
  | 'formula'
  | 'mixed';

export type BreastSide = 'left' | 'right' | 'both';

export type DiaperCondition = 'wet' | 'dirty' | 'both';

export type MeasurementSource =
  | 'home'
  | 'hospital'
  | 'other'
  | 'pediatrician';

interface BaseCareEvent {
  babyId: string;
  id: string;
  notes?: string;
  occurredAt: string;
  recordedById: string;
  recordedByName?: string;
  sourceType: 'baby_note' | 'care_event' | 'measurement';
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

export interface NoteEvent extends BaseCareEvent {
  content: string;
  icon: LucideIcon;
  type: 'note';
}

export interface MeasurementEvent extends BaseCareEvent {
  headCircumferenceMillimeters?: number;
  icon: LucideIcon;
  lengthMillimeters?: number;
  source: string;
  type: 'measurement';
  weightGrams?: number;
}

export type CareEvent =
  | FeedingEvent
  | DiaperEvent
  | SleepEvent
  | NoteEvent
  | MeasurementEvent;

export interface CareBaby {
  birthDate?: string;
  id: string;
  lifeStage: BabyLifeStage;
  name: string;
}

export interface CareDashboard {
  baby: CareBaby;
  canManage: boolean;
  canRecord: boolean;
  events: CareEvent[];
}
