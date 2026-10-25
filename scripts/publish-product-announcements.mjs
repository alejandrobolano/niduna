import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('.github/product-announcements');
const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const sourceCommit = process.env.GITHUB_SHA;

if (!supabaseUrl || !secretKey || !sourceCommit) throw new Error('Supabase announcement publishing variables are not configured');

const files = (await readdir(directory)).filter((file) => file.endsWith('.json'));

for (const file of files) {
  const announcement = JSON.parse(await readFile(resolve(directory, file), 'utf8'));
  const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}` };
  const existingResponse = await fetch(`${supabaseUrl}/rest/v1/product_announcements?id=eq.${encodeURIComponent(announcement.id)}&select=published_at`, { headers });
  if (!existingResponse.ok) throw new Error(`Could not inspect product announcement ${announcement.id}`);

  const [existing] = await existingResponse.json();
  const response = await fetch(`${supabaseUrl}/rest/v1/product_announcements?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      action_label: announcement.actionLabel,
      delivery: announcement.delivery,
      description: announcement.description,
      expires_at: announcement.expiresAt,
      id: announcement.id,
      minimum_native_version: announcement.minimumNativeVersion,
      platforms: announcement.platforms,
      published_at: announcement.status === 'published' ? existing?.published_at ?? new Date().toISOString() : null,
      source_commit: sourceCommit,
      status: announcement.status,
      target_route: announcement.targetRoute,
      title: announcement.title,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Could not publish product announcement ${announcement.id}`);
  console.log(`Published product announcement ${announcement.id}`);
}
