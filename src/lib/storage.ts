/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

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
  const s3Config = getS3Config();
  if (s3Config) {
    const client = getS3Client(s3Config);
    await client.send(new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }));

    return {
      storageKey: input.key,
      cdnUrl: buildS3PublicUrl(s3Config, input.key),
      driver: 's3',
    };
  }

  const uploadDir = join(process.cwd(), 'uploads');
  await mkdir(join(uploadDir, input.key.split('/')[0] ?? ''), { recursive: true });
  await writeFile(join(uploadDir, input.key), input.body);

  return {
    storageKey: input.key,
    cdnUrl: `/uploads/${input.key}`,
    driver: 'local',
  };
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

