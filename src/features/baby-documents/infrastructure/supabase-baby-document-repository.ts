import {
  BabyDocumentError,
  type BabyDocumentMetadata,
  type BabyDocumentRepository,
  type PreparedBabyDocumentFile,
} from '@/features/baby-documents/application/baby-document-repository';
import type { BabyDocument } from '@/features/baby-documents/domain/baby-document';
import { supabase } from '@/shared/infrastructure/supabase/client';

const bucketName = 'baby-documents';
const signedUrlLifetimeSeconds = 2 * 60;

function mapError(error?: { code?: string; message?: string } | null): BabyDocumentError {
  if (error?.code === '42501' || error?.message?.includes('not_allowed')) {
    return new BabyDocumentError('not_allowed');
  }

  if (
    error?.code === '22023' ||
    error?.message?.includes('invalid_')
  ) {
    return new BabyDocumentError('invalid_file');
  }

  return new BabyDocumentError('unknown');
}

async function upload(path: string, file: PreparedBabyDocumentFile): Promise<void> {
  const { error } = await supabase.storage.from(bucketName).upload(
    path,
    file.bytes,
    {
      cacheControl: '120',
      contentType: file.mimeType,
      upsert: false,
    },
  );

  if (error) {
    throw new BabyDocumentError('upload_failed');
  }
}

function metadataArgs(metadata: BabyDocumentMetadata) {
  return {
    target_category: metadata.category,
    target_description: metadata.description?.trim() || null,
    target_display_name: metadata.displayName.trim(),
    target_document_date: metadata.documentDate || null,
  };
}

export const supabaseBabyDocumentRepository: BabyDocumentRepository = {
  async create(babyId, metadata, file) {
    const { data, error } = await supabase.rpc('prepare_baby_document', {
      target_baby_id: babyId,
      target_file_size_bytes: file.size,
      target_mime_type: file.mimeType,
      target_original_file_name: file.name,
      ...metadataArgs(metadata),
    });
    const prepared = data?.[0];

    if (error || !prepared) {
      throw mapError(error);
    }

    await upload(prepared.storage_path, file);

    const { error: publishError } = await supabase.rpc(
      'publish_baby_document',
      { target_document_id: prepared.id },
    );

    if (publishError) {
      throw mapError(publishError);
    }
  },

  async createAccessUrl(documentId) {
    const { data: rows, error } = await supabase
      .from('baby_documents')
      .select('storage_path')
      .eq('id', documentId)
      .maybeSingle();

    if (error || !rows) {
      throw mapError(error ?? { code: '42501' });
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(rows.storage_path, signedUrlLifetimeSeconds);

    if (signedUrlError || !data?.signedUrl) {
      throw mapError(signedUrlError);
    }

    return data.signedUrl;
  },

  async load(babyId, includeRetired) {
    let query = supabase
      .from('baby_documents')
      .select(
        'id, baby_id, author_user_id, display_name, description, category, document_date, original_file_name, mime_type, file_size_bytes, created_at, updated_at, retired_at',
      )
      .eq('baby_id', babyId)
      .eq('status', 'published')
      .order('document_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    query = includeRetired
      ? query.not('retired_at', 'is', null)
      : query.is('retired_at', null);

    const { data: rows, error } = await query;

    if (error) {
      throw mapError(error);
    }

    const authorIds = [...new Set(
      (rows ?? [])
        .map((row) => row.author_user_id)
        .filter((id): id is string => Boolean(id)),
    )];
    const profilesResult = authorIds.length
      ? await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', authorIds)
      : { data: [], error: null };

    if (profilesResult.error) {
      throw mapError(profilesResult.error);
    }

    const authorNames = new Map(
      (profilesResult.data ?? []).map((profile) => [
        profile.id,
        profile.display_name?.trim() || 'Familiar',
      ]),
    );

    return (rows ?? []).map((row): BabyDocument => ({
      authorName: row.author_user_id
        ? authorNames.get(row.author_user_id) ?? 'Familiar'
        : 'Usuario eliminado',
      authorUserId: row.author_user_id ?? undefined,
      babyId: row.baby_id,
      category: row.category,
      createdAt: row.created_at,
      description: row.description ?? undefined,
      displayName: row.display_name,
      documentDate: row.document_date ?? undefined,
      fileSizeBytes: row.file_size_bytes,
      id: row.id,
      mimeType: row.mime_type,
      originalFileName: row.original_file_name,
      retiredAt: row.retired_at ?? undefined,
      updatedAt: row.updated_at,
    }));
  },

  async replace(documentId, file) {
    const { data, error } = await supabase.rpc(
      'prepare_baby_document_replacement',
      {
        target_document_id: documentId,
        target_file_size_bytes: file.size,
        target_mime_type: file.mimeType,
        target_original_file_name: file.name,
      },
    );
    const prepared = data?.[0];

    if (error || !prepared) {
      throw mapError(error);
    }

    await upload(prepared.storage_path, file);

    const { error: publishError } = await supabase.rpc(
      'publish_baby_document_replacement',
      { target_replacement_id: prepared.id },
    );

    if (publishError) {
      throw mapError(publishError);
    }
  },

  async setRetired(documentId, retired) {
    const { error } = await supabase.rpc('set_baby_document_retired', {
      should_retire: retired,
      target_document_id: documentId,
    });

    if (error) {
      throw mapError(error);
    }
  },

  async updateMetadata(documentId, metadata) {
    const { error } = await supabase.rpc('update_baby_document_metadata', {
      target_document_id: documentId,
      ...metadataArgs(metadata),
    });

    if (error) {
      throw mapError(error);
    }
  },
};
