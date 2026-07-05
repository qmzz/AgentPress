/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { access, mkdir, writeFile } from 'fs/promises';
import { dirname, join, resolve, sep } from 'path';

type UploadInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

type UploadResult = {
  storageKey: string;
  cdnUrl: string;
  driver: 's3' | 'local';
};

let s3Client: S3Client | null | undefined;

export async function uploadObject(input: UploadInput): Promise<UploadResult> {
  const storageKey = assertSafeStorageKey(input.key);
  const s3Config = getS3Config();
  if (s3Config) {
    const client = getS3Client(s3Config);
    await client.send(new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: storageKey,
      Body: input.body,
      ContentType: input.contentType,
    }));

    return {
      storageKey,
      cdnUrl: buildS3PublicUrl(s3Config, storageKey),
      driver: 's3',
    };
  }

  const uploadDir = resolve(process.cwd(), 'uploads');
  const targetPath = resolve(uploadDir, storageKey);
  if (targetPath !== uploadDir && !targetPath.startsWith(`${uploadDir}${sep}`)) {
    throw new Error('Unsafe storage key');
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, input.body);

  return {
    storageKey,
    cdnUrl: `/uploads/${storageKey}`,
    driver: 'local',
  };
}

const MAX_STORAGE_KEY_LENGTH = 512;

export function assertSafeStorageKey(key: string) {
  const storageKey = key.trim();
  if (!storageKey || storageKey.length > MAX_STORAGE_KEY_LENGTH || storageKey.startsWith('/') || storageKey.startsWith('\\') || storageKey.includes('\\')) {
    throw new Error('Unsafe storage key');
  }

  const segments = storageKey.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Unsafe storage key');
  }

  return storageKey;
}

export async function getStorageStatus(): Promise<{ ok: boolean; driver: 's3' | 'local'; message?: string }> {
  const s3Config = getS3Config();
  if (s3Config) {
    return {
      ok: true,
      driver: 's3',
      message: s3Config.publicBaseUrl ? 'S3/R2 configured with public base URL' : 'S3/R2 configured',
    };
  }

  try {
    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await access(uploadDir);
    return { ok: true, driver: 'local', message: 'Local uploads directory is writable' };
  } catch (error) {
    return {
      ok: false,
      driver: 'local',
      message: error instanceof Error ? error.message : 'Local uploads directory is not writable',
    };
  }
}

function getS3Client(config: NonNullable<ReturnType<typeof getS3Config>>) {
  if (s3Client) return s3Client;

  s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return s3Client;
}

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    region: process.env.S3_REGION ?? 'auto',
    endpoint: process.env.S3_ENDPOINT,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  };
}

function buildS3PublicUrl(config: NonNullable<ReturnType<typeof getS3Config>>, key: string) {
  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  if (config.endpoint) {
    return `${config.endpoint.replace(/\/$/, '')}/${config.bucket}/${key}`;
  }

  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

