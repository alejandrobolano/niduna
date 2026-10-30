import {
  MedicationError,
  type MedicationAdministrationFilters,
  type MedicationRepository,
} from '@/features/medications/application/medication-repository';
import type {
  BabyMedication,
  MedicationAdministration,
} from '@/features/medications/domain/baby-medication';
import { supabase } from '@/shared/infrastructure/supabase/client';

const medicationColumns = 'id, family_id, baby_id, category, name, presentation, indicated_dose_amount, indicated_dose_unit, administration_route, instructions, indicated_by, start_date, end_date, status, created_by, created_at, updated_by, updated_at, retired_at';
const administrationColumns = 'id, medication_id, family_id, baby_id, medication_name, medication_presentation, administered_at, dose_amount, dose_unit, notes, recorded_by, updated_by, updated_at, retired_at';

function mapError(error?: { code?: string; message?: string } | null): MedicationError {
  if (error?.code === '42501' || error?.message?.includes('not_allowed')) {
    return new MedicationError('not_allowed');
  }
  if (error?.code === '22023' || error?.message?.includes('invalid')) {
    return new MedicationError('invalid');
  }
  if (error?.code === 'P0002' || error?.message?.includes('not_found')) {
    return new MedicationError('not_found');
  }
  return new MedicationError('unavailable');
}

type MedicationRow = {
  administration_route: string | null;
  baby_id: string;
  category: BabyMedication['category'];
  created_at: string;
  created_by: string;
  end_date: string | null;
  family_id: string;
  id: string;
  indicated_by: string | null;
  indicated_dose_amount: number;
  indicated_dose_unit: string;
  instructions: string | null;
  name: string;
  presentation: string;
  retired_at: string | null;
  start_date: string | null;
  status: BabyMedication['status'];
  updated_at: string;
  updated_by: string;
};

type AdministrationRow = {
  administered_at: string;
  baby_id: string;
  dose_amount: number;
  dose_unit: string;
  family_id: string;
  id: string;
  medication_id: string;
  medication_name: string;
  medication_presentation: string;
  notes: string | null;
  recorded_by: string;
  retired_at: string | null;
  updated_at: string;
  updated_by: string;
};

function mapMedication(row: MedicationRow): BabyMedication {
  return {
    administrationRoute: row.administration_route ?? undefined,
    babyId: row.baby_id,
    category: row.category,
    createdAt: row.created_at,
    createdBy: row.created_by,
    endDate: row.end_date ?? undefined,
    familyId: row.family_id,
    id: row.id,
    indicatedBy: row.indicated_by ?? undefined,
    indicatedDoseAmount: Number(row.indicated_dose_amount),
    indicatedDoseUnit: row.indicated_dose_unit,
    instructions: row.instructions ?? undefined,
    name: row.name,
    presentation: row.presentation,
    retiredAt: row.retired_at ?? undefined,
    startDate: row.start_date ?? undefined,
    status: row.status,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function mapAdministration(row: AdministrationRow, recorderName?: string): MedicationAdministration {
  return {
    administeredAt: row.administered_at,
    babyId: row.baby_id,
    doseAmount: Number(row.dose_amount),
    doseUnit: row.dose_unit,
    familyId: row.family_id,
    id: row.id,
    medicationId: row.medication_id,
    medicationName: row.medication_name,
    medicationPresentation: row.medication_presentation,
    notes: row.notes ?? undefined,
    recordedBy: row.recorded_by,
    recorderName,
    retiredAt: row.retired_at ?? undefined,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function applyFilters<Builder extends {
  eq: (column: string, value: string) => Builder;
  gte: (column: string, value: string) => Builder;
  is: (column: string, value: null) => Builder;
  lte: (column: string, value: string) => Builder;
  not: (column: string, operator: string, value: null) => Builder;
}>(query: Builder, filters: MedicationAdministrationFilters): Builder {
  let filtered = filters.retired
    ? query.not('retired_at', 'is', null)
    : query.is('retired_at', null);
  if (filters.medicationId) filtered = filtered.eq('medication_id', filters.medicationId);
  if (filters.startAt) filtered = filtered.gte('administered_at', filters.startAt);
  if (filters.endAt) filtered = filtered.lte('administered_at', filters.endAt);
  return filtered;
}

async function withRecorderNames(rows: AdministrationRow[]): Promise<MedicationAdministration[]> {
  const userIds = [...new Set(rows.map((row) => row.recorded_by))];
  if (!userIds.length) return [];
  const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
  if (error) throw mapError(error);
  const names = new Map((data ?? []).map((profile) => [profile.id, profile.display_name]));
  return rows.map((row) => mapAdministration(row, names.get(row.recorded_by) || 'Miembro de la familia'));
}

export const supabaseMedicationRepository: MedicationRepository = {
  async exportAdministrations(babyId, filters) {
    const administrations: MedicationAdministration[] = [];
    const batchSize = 500;
    let start = 0;
    while (true) {
      let query = supabase.from('baby_medication_administrations').select(administrationColumns)
        .eq('baby_id', babyId).order('administered_at', { ascending: false })
        .range(start, start + batchSize - 1);
      query = applyFilters(query, filters);
      const { data, error } = await query;
      if (error) throw mapError(error);
      const rows = (data ?? []) as AdministrationRow[];
      administrations.push(...await withRecorderNames(rows));
      if (rows.length < batchSize) return administrations;
      start += batchSize;
    }
  },

  async loadAdministrationPage(babyId, page, pageSize, filters) {
    const start = (page - 1) * pageSize;
    let query = supabase.from('baby_medication_administrations')
      .select(administrationColumns, { count: 'exact' }).eq('baby_id', babyId)
      .order('administered_at', { ascending: false }).range(start, start + pageSize - 1);
    query = applyFilters(query, filters);
    const { data, error, count } = await query;
    if (error) throw mapError(error);
    const total = count ?? 0;
    return {
      administrations: await withRecorderNames((data ?? []) as AdministrationRow[]),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async loadMedications(babyId, retired = false) {
    let query = supabase.from('baby_medications').select(medicationColumns).eq('baby_id', babyId)
      .order('status').order('name');
    query = retired ? query.not('retired_at', 'is', null) : query.is('retired_at', null);
    const { data, error } = await query;
    if (error) throw mapError(error);
    return ((data ?? []) as MedicationRow[]).map(mapMedication);
  },

  async saveAdministration(draft, administrationId) {
    const { data, error } = await supabase.rpc('save_medication_administration', {
      target_administered_at: draft.administeredAt,
      target_administration_id: administrationId ?? null,
      target_dose_amount: draft.doseAmount,
      target_dose_unit: draft.doseUnit.trim(),
      target_medication_id: draft.medicationId,
      target_notes: draft.notes?.trim() || null,
    });
    if (error || !data) throw mapError(error);
    return data;
  },

  async saveMedication(babyId, draft, medicationId) {
    const { data, error } = await supabase.rpc('save_baby_medication', {
      target_administration_route: draft.administrationRoute?.trim() || null,
      target_baby_id: babyId,
      target_category: draft.category,
      target_end_date: draft.endDate || null,
      target_indicated_by: draft.indicatedBy?.trim() || null,
      target_indicated_dose_amount: draft.indicatedDoseAmount,
      target_indicated_dose_unit: draft.indicatedDoseUnit.trim(),
      target_instructions: draft.instructions?.trim() || null,
      target_medication_id: medicationId ?? null,
      target_name: draft.name.trim(),
      target_presentation: draft.presentation.trim(),
      target_start_date: draft.startDate || null,
      target_status: draft.status,
    });
    if (error || !data) throw mapError(error);
    return data;
  },

  async setAdministrationRetired(administrationId, retired) {
    const { error } = await supabase.rpc('set_medication_administration_retired', {
      should_retire: retired,
      target_administration_id: administrationId,
    });
    if (error) throw mapError(error);
  },

  async setMedicationRetired(medicationId, retired) {
    const { error } = await supabase.rpc('set_baby_medication_retired', {
      should_retire: retired,
      target_medication_id: medicationId,
    });
    if (error) throw mapError(error);
  },
};
