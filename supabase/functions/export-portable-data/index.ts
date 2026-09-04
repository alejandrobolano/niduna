import { withSupabase } from 'npm:@supabase/server@1.4.1';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.110.8';
import JSZip from 'npm:jszip@3.10.1';

import {
  canExportFamily,
  createPortableCsv,
  getActiveDocumentFiles,
  parsePortableExportRequest,
  type PortableExportFile,
  type PortableExportRequest,
} from '../_shared/data-export-rules.ts';

interface UserClaims {
  email?: string;
  id?: string;
}

type ExportRow = Record<string, unknown>;
type ExportData = Record<string, ExportRow[]>;

const maximumBinaryBytes = 25 * 1024 * 1024;
const corsHeaders = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Disposition',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

async function readRequest(request: Request): Promise<PortableExportRequest | undefined> {
  try {
    return parsePortableExportRequest(await request.json());
  } catch {
    return undefined;
  }
}

async function selectRows(
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<ExportRow[]> {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? (data as ExportRow[]) : [];
}

async function loadPersonalData(
  client: SupabaseClient,
  userId: string,
  email: string | undefined,
): Promise<{
  data: ExportData;
  documentFiles: PortableExportFile[];
  storyFiles: PortableExportFile[];
}> {
  const memberships = await selectRows(
    client
      .from('family_members')
      .select('id, family_id, role, relationship, created_at, updated_at')
      .eq('user_id', userId),
  );
  const familyIds = memberships.map((membership) => String(membership.family_id));
  const now = new Date().toISOString();
  const [
    profiles,
    families,
    preferences,
    careEvents,
    notes,
    measurements,
    stories,
    documents,
    contacts,
  ] = await Promise.all([
      selectRows(
        client
          .from('profiles')
          .select('id, display_name, avatar_path, created_at, updated_at')
          .eq('id', userId),
      ),
      familyIds.length === 0
        ? Promise.resolve([])
        : selectRows(
            client
              .from('families')
              .select('id, name, created_at, updated_at')
              .in('id', familyIds),
          ),
      selectRows(
        client
          .from('notification_preferences')
          .select(
            'family_id, feeding_enabled, diaper_enabled, sleep_enabled, note_enabled, measurement_enabled, story_enabled, paused_until, created_at, updated_at',
          )
          .eq('user_id', userId),
      ),
      selectRows(client.from('care_events').select('*').eq('recorded_by', userId)),
      selectRows(client.from('baby_notes').select('*').eq('recorded_by', userId)),
      selectRows(
        client.from('baby_measurements').select('*').eq('recorded_by', userId),
      ),
      selectRows(
        client
          .from('family_stories')
          .select(
            'id, family_id, baby_id, author_user_id, storage_path, mime_type, file_size_bytes, created_at, published_at, expires_at',
          )
          .eq('author_user_id', userId)
          .not('published_at', 'is', null)
          .is('removed_at', null)
          .eq('cleanup_status', 'not_due')
          .gt('expires_at', now),
      ),
      selectRows(
        client
          .from('baby_documents')
          .select(
            'id, family_id, baby_id, author_user_id, display_name, description, category, document_date, original_file_name, storage_path, mime_type, file_size_bytes, status, created_at, updated_at, published_at, retired_at, retired_by',
          )
          .eq('author_user_id', userId),
      ),
      selectRows(
        client
          .from('baby_contacts')
          .select(
            'id, family_id, baby_id, author_user_id, name, category, contact_person, phone, address, website_url, notes, is_featured, created_at, updated_at, retired_at, retired_by',
          )
          .eq('author_user_id', userId),
      ),
    ]);

  return {
    data: {
      account: [{ email: email ?? null, user_id: userId }],
      baby_contacts: contacts,
      baby_documents: documents,
      care_events: careEvents,
      families,
      family_memberships: memberships,
      family_stories: stories,
      measurements,
      notes,
      notification_preferences: preferences,
      profile: profiles,
    },
    documentFiles: getActiveDocumentFiles(documents),
    storyFiles: stories.map((story) => ({ path: String(story.storage_path) })),
  };
}

async function canManageFamilyExport(
  client: SupabaseClient,
  familyId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return canExportFamily(data?.role);
}

async function loadFamilyData(
  client: SupabaseClient,
  familyId: string,
): Promise<{
  babyPhotoPaths: string[];
  data: ExportData;
  documentFiles: PortableExportFile[];
  familyName: string;
  storyFiles: PortableExportFile[];
}> {
  const [families, memberships, babies] = await Promise.all([
    selectRows(
      client
        .from('families')
        .select('id, name, created_by, created_at, updated_at')
        .eq('id', familyId),
    ),
    selectRows(
      client
        .from('family_members')
        .select(
          'id, family_id, user_id, role, relationship, created_by, created_at, updated_at',
        )
        .eq('family_id', familyId),
    ),
    selectRows(client.from('babies').select('*').eq('family_id', familyId)),
  ]);
  const family = families[0];

  if (!family) {
    throw new Error('family_not_found');
  }

  const memberIds = memberships.map((membership) => String(membership.user_id));
  const babyIds = babies.map((baby) => String(baby.id));
  const now = new Date().toISOString();
  const [
    profiles,
    careEvents,
    notes,
    measurements,
    stories,
    documents,
    contacts,
  ] = await Promise.all([
    memberIds.length === 0
      ? Promise.resolve([])
      : selectRows(
          client
            .from('profiles')
            .select('id, display_name, avatar_path, created_at, updated_at')
            .in('id', memberIds),
        ),
    babyIds.length === 0
      ? Promise.resolve([])
      : selectRows(client.from('care_events').select('*').in('baby_id', babyIds)),
    babyIds.length === 0
      ? Promise.resolve([])
      : selectRows(client.from('baby_notes').select('*').in('baby_id', babyIds)),
    babyIds.length === 0
      ? Promise.resolve([])
      : selectRows(
          client.from('baby_measurements').select('*').in('baby_id', babyIds),
        ),
    selectRows(
      client
        .from('family_stories')
        .select(
          'id, family_id, baby_id, author_user_id, storage_path, mime_type, file_size_bytes, created_at, published_at, expires_at',
        )
        .eq('family_id', familyId)
        .not('published_at', 'is', null)
        .is('removed_at', null)
        .eq('cleanup_status', 'not_due')
        .gt('expires_at', now),
    ),
    selectRows(
      client
        .from('baby_documents')
        .select(
          'id, family_id, baby_id, author_user_id, display_name, description, category, document_date, original_file_name, storage_path, mime_type, file_size_bytes, status, created_at, updated_at, published_at, retired_at, retired_by',
        )
        .eq('family_id', familyId),
    ),
    selectRows(
      client
        .from('baby_contacts')
        .select(
          'id, family_id, baby_id, author_user_id, name, category, contact_person, phone, address, website_url, notes, is_featured, created_at, updated_at, retired_at, retired_by',
        )
        .eq('family_id', familyId),
    ),
  ]);

  return {
    babyPhotoPaths: babies
      .map((baby) => baby.photo_path)
      .filter((path): path is string => typeof path === 'string'),
    data: {
      babies,
      baby_contacts: contacts,
      baby_documents: documents,
      care_events: careEvents,
      families,
      family_members: memberships,
      family_stories: stories,
      measurements,
      notes,
      profiles,
    },
    documentFiles: getActiveDocumentFiles(documents),
    familyName: String(family.name),
    storyFiles: stories.map((story) => ({ path: String(story.storage_path) })),
  };
}

function safeFileName(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'datos';
}

function storageFileName(path: string): string {
  return path.split('/').at(-1)?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'archivo';
}

async function addStorageFiles(
  zip: JSZip,
  client: SupabaseClient,
  bucket: string,
  files: PortableExportFile[],
  targetFolder: string,
  currentBytes: number,
): Promise<number> {
  let totalBytes = currentBytes;
  const uniqueFiles = [
    ...new Map(files.map((file) => [file.path, file])).values(),
  ];

  for (const [index, file] of uniqueFiles.entries()) {
    const { data, error } = await client.storage.from(bucket).download(file.path);

    if (error || !data) {
      throw new Error(error?.message ?? 'storage_download_failed');
    }

    totalBytes += data.size;
    if (totalBytes > maximumBinaryBytes) {
      throw new Error('export_too_large');
    }

    zip.file(
      `files/${targetFolder}/${index + 1}-${storageFileName(file.fileName ?? file.path)}`,
      new Uint8Array(await data.arrayBuffer()),
    );
  }

  return totalBytes;
}

async function createZip(
  client: SupabaseClient,
  scope: PortableExportRequest,
  data: ExportData,
  babyPhotoFiles: PortableExportFile[],
  documentFiles: PortableExportFile[],
  storyFiles: PortableExportFile[],
): Promise<Uint8Array> {
  const zip = new JSZip();
  const generatedAt = new Date().toISOString();
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        formatVersion: '1.0',
        generatedAt,
        product: 'Niduna',
        scope: scope.type,
      },
      null,
      2,
    ),
  );
  zip.file(
    'README.txt',
    [
      'Copia portable de datos de Niduna',
      '',
      `Generada: ${generatedAt}`,
      'Formato: JSON y CSV con fechas ISO 8601.',
      'Los archivos multimedia incluidos estaban activos en el momento de la descarga.',
      scope.type === 'personal'
        ? 'La copia personal contiene solamente tu perfil y tus aportaciones.'
        : 'La copia familiar contiene la información compartida de la familia seleccionada.',
      'Esta copia sirve para consultar y conservar tus datos; no es restaurable automáticamente en Niduna.',
    ].join('\n'),
  );

  for (const [name, rows] of Object.entries(data)) {
    zip.file(`data/${name}.json`, JSON.stringify(rows, null, 2));
    zip.file(`data/${name}.csv`, createPortableCsv(rows));
  }

  let binaryBytes = await addStorageFiles(
    zip,
    client,
    'baby-photos',
    babyPhotoFiles,
    'baby-photos',
    0,
  );
  binaryBytes = await addStorageFiles(
    zip,
    client,
    'family-stories',
    storyFiles,
    'stories',
    binaryBytes,
  );
  await addStorageFiles(
    zip,
    client,
    'baby-documents',
    documentFiles,
    'documents',
    binaryBytes,
  );

  return zip.generateAsync({ compression: 'DEFLATE', type: 'uint8array' });
}

const authenticatedHandler = withSupabase(
  { auth: 'user' },
  async (request, context) => {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405);
    }

    const claims = context.userClaims as UserClaims | undefined;
    const userId = claims?.id;
    if (!userId) {
      return jsonResponse({ error: 'authentication_required' }, 401);
    }

    const scope = await readRequest(request);
    if (!scope) {
      return jsonResponse({ error: 'invalid_request' }, 400);
    }

    try {
      let data: ExportData;
      let babyPhotoFiles: PortableExportFile[] = [];
      let documentFiles: PortableExportFile[];
      let storyFiles: PortableExportFile[];
      let fileStem: string;

      if (scope.type === 'personal') {
        const personalExport = await loadPersonalData(
          context.supabase,
          userId,
          claims.email,
        );
        data = personalExport.data;
        documentFiles = personalExport.documentFiles;
        storyFiles = personalExport.storyFiles;
        fileStem = 'niduna-mis-datos';
      } else {
        if (!(await canManageFamilyExport(context.supabase, scope.familyId, userId))) {
          return jsonResponse({ error: 'family_manager_required' }, 403);
        }

        const familyExport = await loadFamilyData(context.supabase, scope.familyId);
        data = familyExport.data;
        babyPhotoFiles = familyExport.babyPhotoPaths.map((path) => ({ path }));
        documentFiles = familyExport.documentFiles;
        storyFiles = familyExport.storyFiles;
        fileStem = `niduna-familia-${safeFileName(familyExport.familyName)}`;
      }

      const archive = await createZip(
        context.supabase,
        scope,
        data,
        babyPhotoFiles,
        documentFiles,
        storyFiles,
      );
      const date = new Date().toISOString().slice(0, 10);

      return new Response(archive as BodyInit, {
        headers: {
          ...corsHeaders,
          'Content-Disposition': `attachment; filename="${fileStem}-${date}.zip"`,
          'Content-Type': 'application/octet-stream',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      console.error('Portable data export failed', message);
      return jsonResponse(
        { error: message === 'export_too_large' ? message : 'export_failed' },
        message === 'export_too_large' ? 413 : 500,
      );
    }
  },
);

Deno.serve((request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return authenticatedHandler(request);
});
