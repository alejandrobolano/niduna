import {
  BabyExpenseError,
  type BabyExpenseFilters,
  type BabyExpenseRepository,
} from '@/features/baby-expenses/application/baby-expense-repository';
import type { BabyExpense } from '@/features/baby-expenses/domain/baby-expense';
import { supabase } from '@/shared/infrastructure/supabase/client';

const expenseColumns = 'id, baby_id, concept, amount_minor, currency, category, paid_by_user_id, expense_date, notes, created_by, retired_at';

function mapError(error?: { code?: string; message?: string } | null): BabyExpenseError {
  if (error?.message?.includes('expense_currency_locked')) {
    return new BabyExpenseError('currency_locked');
  }
  if (error?.code === '42501' || error?.message?.includes('not_allowed')) {
    return new BabyExpenseError('not_allowed');
  }
  if (error?.code === '22023' || error?.message?.includes('invalid')) {
    return new BabyExpenseError('invalid');
  }
  return new BabyExpenseError('unavailable');
}

function mapRow(row: {
  amount_minor: number;
  baby_id: string;
  category: BabyExpense['category'];
  concept: string;
  created_by: string;
  currency: string;
  expense_date: string;
  id: string;
  notes: string | null;
  paid_by_user_id: string;
  retired_at: string | null;
}): BabyExpense {
  return {
    amountMinor: row.amount_minor,
    babyId: row.baby_id,
    category: row.category,
    concept: row.concept,
    createdBy: row.created_by,
    currency: row.currency,
    expenseDate: row.expense_date,
    id: row.id,
    notes: row.notes ?? undefined,
    paidByUserId: row.paid_by_user_id,
    retiredAt: row.retired_at ?? undefined,
  };
}

function applyFilters<Builder extends {
  eq: (column: string, value: string) => Builder;
  gte: (column: string, value: string) => Builder;
  is: (column: string, value: null) => Builder;
  lte: (column: string, value: string) => Builder;
  not: (column: string, operator: string, value: null) => Builder;
}>(query: Builder, filters: BabyExpenseFilters): Builder {
  let filtered = query
    .gte('expense_date', filters.startDate)
    .lte('expense_date', filters.endDate);
  filtered = filters.retired
    ? filtered.not('retired_at', 'is', null)
    : filtered.is('retired_at', null);
  if (filters.category) filtered = filtered.eq('category', filters.category);
  if (filters.paidByUserId) filtered = filtered.eq('paid_by_user_id', filters.paidByUserId);
  return filtered;
}

export const supabaseBabyExpenseRepository: BabyExpenseRepository = {
  async exportAll(babyId, filters) {
    const expenses: BabyExpense[] = [];
    const batchSize = 500;
    let start = 0;
    while (true) {
      let query = supabase
        .from('baby_expenses')
        .select(expenseColumns)
        .eq('baby_id', babyId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(start, start + batchSize - 1);
      query = applyFilters(query, filters);
      const { data, error } = await query;
      if (error) throw mapError(error);
      const rows = data ?? [];
      expenses.push(...rows.map(mapRow));
      if (rows.length < batchSize) return expenses;
      start += batchSize;
    }
  },

  async isCurrencyLocked(familyId) {
    const { count, error } = await supabase
      .from('baby_expenses')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', familyId);
    if (error) throw mapError(error);
    return (count ?? 0) > 0;
  },

  async loadCurrency(familyId) {
    const { data, error } = await supabase
      .from('families')
      .select('expense_currency')
      .eq('id', familyId)
      .single();
    if (error) throw mapError(error);
    return data.expense_currency;
  },

  async loadPage(babyId, page, pageSize, filters) {
    const start = (page - 1) * pageSize;
    let query = supabase
      .from('baby_expenses')
      .select(expenseColumns, { count: 'exact' })
      .eq('baby_id', babyId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(start, start + pageSize - 1);
    query = applyFilters(query, filters);

    const [pageResult, totalResult] = await Promise.all([
      query,
      supabase.rpc('get_baby_expense_total', {
        target_baby_id: babyId,
        target_category: filters.category ?? null,
        target_end_date: filters.endDate,
        target_paid_by_user_id: filters.paidByUserId ?? null,
        target_retired: filters.retired,
        target_start_date: filters.startDate,
      }),
    ]);
    if (pageResult.error) throw mapError(pageResult.error);
    if (totalResult.error) throw mapError(totalResult.error);
    const totalCount = pageResult.count ?? 0;
    return {
      expenses: (pageResult.data ?? []).map(mapRow),
      page,
      pageSize,
      totalAmountMinor: totalResult.data ?? 0,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    };
  },

  async loadPayers(familyId) {
    const { data: members, error: memberError } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('family_id', familyId)
      .order('created_at');
    if (memberError) throw mapError(memberError);
    const userIds = (members ?? []).map((member) => member.user_id);
    if (!userIds.length) return [];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    if (profileError) throw mapError(profileError);
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
    return userIds.map((userId) => ({
      displayName: names.get(userId) || 'Miembro de la familia',
      userId,
    }));
  },

  async save(babyId, draft, expenseId) {
    const { data, error } = await supabase.rpc('save_baby_expense', {
      target_amount_minor: draft.amountMinor,
      target_baby_id: babyId,
      target_category: draft.category,
      target_concept: draft.concept.trim(),
      target_expense_date: draft.expenseDate,
      target_expense_id: expenseId ?? null,
      target_notes: draft.notes?.trim() || null,
      target_paid_by_user_id: draft.paidByUserId,
      target_timezone_offset_minutes: new Date().getTimezoneOffset(),
    });
    if (error || !data) throw mapError(error);
    return data;
  },

  async setCurrency(familyId, currency) {
    const { error } = await supabase.rpc('set_family_expense_currency', {
      target_currency: currency,
      target_family_id: familyId,
    });
    if (error) throw mapError(error);
  },

  async setRetired(expenseId, retired) {
    const { error } = await supabase.rpc('set_baby_expense_retired', {
      should_retire: retired,
      target_expense_id: expenseId,
    });
    if (error) throw mapError(error);
  },
};
