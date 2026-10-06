import { Upload } from 'tus-js-client';

import type { PreparedStoryMedia } from '@/features/family-stories/application/family-story-repository';
import { supabase } from '@/shared/infrastructure/supabase/client';

const bucketName = 'family-stories';
const chunkSizeBytes = 6 * 1024 * 1024;

function getResumableEndpoint(): string {
  const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!projectUrl) {
    throw new Error('Supabase environment variables are not configured');
  }

  const url = new URL(projectUrl);
  url.hostname = url.hostname.replace('.supabase.co', '.storage.supabase.co');
  url.pathname = '/storage/v1/upload/resumable';
  return url.toString();
}

export async function uploadStoryVideo(
  path: string,
  media: PreparedStoryMedia,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Authentication session is unavailable');
  }

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(media.bytes, {
      chunkSize: chunkSizeBytes,
      endpoint: getResumableEndpoint(),
      headers: {
        authorization: `Bearer ${session.access_token}`,
      },
      metadata: {
        bucketName,
        cacheControl: '300',
        contentType: media.mimeType,
        objectName: path,
      },
      onError: reject,
      onSuccess: () => resolve(),
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 3_000, 5_000, 10_000],
      uploadDataDuringCreation: true,
    });

    void upload.findPreviousUploads().then((previousUploads) => {
      const previousUpload = previousUploads[0];

      if (previousUpload) {
        upload.resumeFromPreviousUpload(previousUpload);
      }

      upload.start();
    }).catch(reject);
  });
}
