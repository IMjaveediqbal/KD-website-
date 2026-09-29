import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const bucket = process.env.STORAGE_BUCKET;
const endpoint = process.env.STORAGE_ENDPOINT;
const region = process.env.STORAGE_REGION || "auto";

function requireStorage() {
  if (!bucket || !process.env.STORAGE_ACCESS_KEY_ID || !process.env.STORAGE_SECRET_ACCESS_KEY) {
    throw new Error("Object storage is not configured.");
  }
  return bucket;
}

export function createStorageClient() {
  requireStorage();
  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
  });
}

export async function createAudioUploadUrl(storageKey: string, mimeType: string) {
  const bucketName = requireStorage();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    ContentType: mimeType,
  });
  return getSignedUrl(createStorageClient(), command, { expiresIn: 900 });
}

export async function headStoredObject(storageKey: string) {
  const bucketName = requireStorage();
  return createStorageClient().send(new HeadObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
  }));
}
