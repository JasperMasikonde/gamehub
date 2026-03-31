import { Storage } from "@google-cloud/storage";

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (!_storage) {
    const keyFile = process.env.GCS_KEY_FILE;
    _storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      ...(keyFile ? { keyFilename: keyFile } : {}),
    });
  }
  return _storage;
}

const BUCKET = () => process.env.GCS_BUCKET_NAME!;

export async function generateSignedUploadUrl(
  gcsKey: string,
  contentType: string
): Promise<string> {
  const storage = getStorage();
  const [url] = await storage
    .bucket(BUCKET())
    .file(gcsKey)
    .getSignedUrl({
      action: "write",
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      contentType,
    });
  return url;
}

export async function generateSignedReadUrl(gcsKey: string): Promise<string> {
  const storage = getStorage();
  const [url] = await storage
    .bucket(BUCKET())
    .file(gcsKey)
    .getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
  return url;
}

export async function deleteGCSObject(gcsKey: string): Promise<void> {
  const storage = getStorage();
  await storage.bucket(BUCKET()).file(gcsKey).delete({ ignoreNotFound: true });
}

export function getPublicUrl(gcsKey: string): string {
  return `https://storage.googleapis.com/${BUCKET()}/${gcsKey}`;
}
