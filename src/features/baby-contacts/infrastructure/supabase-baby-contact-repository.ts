import {
  BabyContactError,
  type BabyContactRepository,
} from '@/features/baby-contacts/application/baby-contact-repository';
import type { BabyContact } from '@/features/baby-contacts/domain/baby-contact';
import { normalizeWebsiteUrl } from '@/features/baby-contacts/application/validate-baby-contact';
import { supabase } from '@/shared/infrastructure/supabase/client';

function mapError(error?: { code?: string; message?: string } | null): BabyContactError {
  if (error?.code === '42501' || error?.message?.includes('not_allowed')) {
    return new BabyContactError('not_allowed');
  }
  if (error?.code === '22023' || error?.message?.includes('invalid')) {
    return new BabyContactError('invalid');
  }
  return new BabyContactError('unavailable');
}

function optional(value?: string): string | null {
  return value?.trim() || null;
}

function mapRow(row: {
  address: string | null;
  author_user_id: string | null;
  baby_id: string;
  category: BabyContact['category'];
  contact_person: string | null;
  created_at: string;
  id: string;
  is_featured: boolean;
  name: string;
  notes: string | null;
  phone: string | null;
  retired_at: string | null;
  updated_at: string;
  website_url: string | null;
}): BabyContact {
  return {
    address: row.address ?? undefined,
    authorUserId: row.author_user_id ?? undefined,
    babyId: row.baby_id,
    category: row.category,
    contactPerson: row.contact_person ?? undefined,
    createdAt: row.created_at,
    id: row.id,
    isFeatured: row.is_featured,
    name: row.name,
    notes: row.notes ?? undefined,
    phone: row.phone ?? undefined,
    retiredAt: row.retired_at ?? undefined,
    updatedAt: row.updated_at,
    websiteUrl: row.website_url ?? undefined,
  };
}

export const supabaseBabyContactRepository: BabyContactRepository = {
  async loadPage(babyId, page, pageSize, filters) {
    const start = (page - 1) * pageSize;
    let query = supabase
      .from('baby_contacts')
      .select(
        'id, baby_id, author_user_id, name, category, contact_person, phone, address, website_url, notes, is_featured, created_at, updated_at, retired_at',
        { count: 'exact' },
      )
      .eq('baby_id', babyId)
      .order('is_featured', { ascending: false })
      .order('name')
      .range(start, start + pageSize - 1);

    query = filters.retired
      ? query.not('retired_at', 'is', null)
      : query.is('retired_at', null);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.search?.trim()) {
      query = query.ilike('name', `%${filters.search.trim().replace(/[%_]/g, '\\$&')}%`);
    }

    const { count, data, error } = await query;
    if (error) throw mapError(error);
    const totalCount = count ?? 0;
    return {
      contacts: (data ?? []).map(mapRow),
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    };
  },

  async save(babyId, draft, contactId) {
    const { data, error } = await supabase.rpc('save_baby_contact', {
      target_address: optional(draft.address),
      target_baby_id: babyId,
      target_category: draft.category,
      target_contact_id: contactId ?? null,
      target_contact_person: optional(draft.contactPerson),
      target_is_featured: draft.isFeatured,
      target_name: draft.name.trim(),
      target_notes: optional(draft.notes),
      target_phone: optional(draft.phone),
      target_website_url: normalizeWebsiteUrl(draft.websiteUrl) ?? null,
    });
    if (error || !data) throw mapError(error);
    return data;
  },

  async setRetired(contactId, retired) {
    const { error } = await supabase.rpc('set_baby_contact_retired', {
      should_retire: retired,
      target_contact_id: contactId,
    });
    if (error) throw mapError(error);
  },
};
