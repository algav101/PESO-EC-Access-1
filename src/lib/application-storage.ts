import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ACCEPTED_APPLICATION_FILE_TYPES, MAX_APPLICATION_FILE_SIZE, isAcceptedApplicationFile } from "@/lib/application-schema";

export const APPLICATION_DOCUMENT_BUCKET = process.env.TUPAD_APPLICATION_DOCUMENTS_BUCKET || "tupad-application-documents";

let bucketReady: Promise<void> | null = null;

function getPrivateStorageClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("PRIVATE_STORAGE_NOT_CONFIGURED");
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensurePrivateBucket(client: SupabaseClient): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data, error } = await client.storage.getBucket(APPLICATION_DOCUMENT_BUCKET);
      if (data && !error) {
        if (data.public) throw new Error("APPLICATION_DOCUMENT_BUCKET_MUST_BE_PRIVATE");
        return;
      }
      if (error && ["401", "403"].includes(String(error.statusCode))) {
        throw new Error("PRIVATE_STORAGE_CREDENTIALS_REJECTED");
      }

      const { error: createError } = await client.storage.createBucket(APPLICATION_DOCUMENT_BUCKET, {
        public: false,
        allowedMimeTypes: [...ACCEPTED_APPLICATION_FILE_TYPES],
        fileSizeLimit: MAX_APPLICATION_FILE_SIZE,
      });
      if (createError && !/already exists/i.test(createError.message)) throw new Error("PRIVATE_STORAGE_BUCKET_UNAVAILABLE");
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  return bucketReady;
}

function extensionFor(file: File): string {
  const byMime: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/tiff": "tiff",
    "image/bmp": "bmp",
  };
  return byMime[file.type] || "bin";
}

export async function uploadApplicationDocument(
  applicationId: string,
  fieldName: string,
  subject: string,
  file: File
): Promise<{ bucket: string; key: string }> {
  const validationError = isAcceptedApplicationFile(file);
  if (validationError) throw new Error(validationError);

  const client = getPrivateStorageClient();
  await ensurePrivateBucket(client);
  const key = `${applicationId}/${subject.toLowerCase()}/${fieldName}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const body = new Uint8Array(await file.arrayBuffer());
  const { error } = await client.storage.from(APPLICATION_DOCUMENT_BUCKET).upload(key, body, {
    contentType: file.type,
    cacheControl: "private, max-age=0, no-store",
    upsert: false,
  });
  if (error) throw new Error("PRIVATE_DOCUMENT_UPLOAD_FAILED");
  return { bucket: APPLICATION_DOCUMENT_BUCKET, key };
}

export async function downloadApplicationDocument(bucket: string, key: string): Promise<Blob> {
  const client = getPrivateStorageClient();
  const { data, error } = await client.storage.from(bucket).download(key);
  if (error || !data) throw new Error("PRIVATE_DOCUMENT_DOWNLOAD_FAILED");
  return data;
}

export async function removeApplicationDocuments(paths: Array<{ bucket: string; key: string }>): Promise<void> {
  const client = getPrivateStorageClient();
  const grouped = new Map<string, string[]>();
  for (const path of paths) grouped.set(path.bucket, [...(grouped.get(path.bucket) || []), path.key]);
  await Promise.all([...grouped.entries()].map(([bucket, keys]) => client.storage.from(bucket).remove(keys)));
}
