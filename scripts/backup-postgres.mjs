/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { createGzip } from 'node:zlib';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const backupDir = path.resolve(process.env.BACKUP_DIR ?? path.join(process.cwd(), 'uploads', 'backups'));
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = process.env.BACKUP_FILENAME ?? `agentpress-${timestamp}.sql.gz`;
const outputPath = path.join(backupDir, filename);

await mkdir(backupDir, { recursive: true });
await runPgDump(outputPath);
console.log(`Backup written: ${outputPath}`);

const uploadResult = await maybeUploadToS3(outputPath, filename);
if (uploadResult) {
  console.log(`Backup uploaded: s3://${uploadResult.bucket}/${uploadResult.key}`);
}

await pruneLocalBackups();

async function runPgDump(targetPath) {
  const pgDumpBin = process.env.PG_DUMP_BIN ?? 'pg_dump';
  const args = [
    '--no-owner',
    '--no-privileges',
    '--format=plain',
    connectionString,
  ];

  const child = spawn(pgDumpBin, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const exitPromise = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
    });
  });

  await Promise.all([
    pipeline(child.stdout, createGzip(), await import('node:fs').then((fs) => fs.createWriteStream(targetPath))),
    exitPromise,
  ]);
}

async function maybeUploadToS3(filePath, fileName) {
  const bucket = process.env.BACKUP_S3_BUCKET;
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket) return null;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('BACKUP_S3_BUCKET is set, but S3 access key or secret is missing');
  }

  const region = process.env.BACKUP_S3_REGION ?? process.env.S3_REGION ?? 'auto';
  const endpoint = process.env.BACKUP_S3_ENDPOINT ?? process.env.S3_ENDPOINT;
  const prefix = (process.env.BACKUP_S3_PREFIX ?? 'database-backups').replace(/^\/+|\/+$/g, '');
  const key = `${prefix}/${fileName}`;
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: (process.env.BACKUP_S3_FORCE_PATH_STYLE ?? process.env.S3_FORCE_PATH_STYLE) === 'true',
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: createReadStream(filePath),
    ContentType: 'application/gzip',
  }));

  return { bucket, key };
}

async function pruneLocalBackups() {
  const retentionDays = Number.parseInt(process.env.BACKUP_LOCAL_RETENTION_DAYS ?? '14', 10);
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const entries = await readdir(backupDir).catch(() => []);
  for (const entry of entries) {
    if (!entry.endsWith('.sql.gz')) continue;
    const filePath = path.join(backupDir, entry);
    const info = await stat(filePath).catch(() => null);
    if (info && info.mtimeMs < cutoff) {
      await rm(filePath, { force: true });
      console.log(`Pruned old local backup: ${filePath}`);
    }
  }
}
