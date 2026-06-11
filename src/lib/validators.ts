/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { z } from 'zod';

const webhookUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith('http://') || url.startsWith('https://'), 'Webhook URL must start with http:// or https://');

// ─── Content Block Validators ────────────────────────

const textBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string().min(1),
});

const imageBlockSchema = z.object({
  type: z.literal('image'),
  mediaId: z.string().uuid(),
  caption: z.string().optional(),
  alt: z.string().optional(),
});

const codeBlockSchema = z.object({
  type: z.literal('code'),
  language: z.string().optional(),
  filename: z.string().optional(),
  content: z.string().min(1),
});

const chartBlockSchema = z.object({
  type: z.literal('chart'),
  chartType: z.string(),
  data: z.record(z.unknown()),
  title: z.string().optional(),
});

const audioBlockSchema = z.object({
  type: z.literal('audio'),
  mediaId: z.string().uuid(),
  title: z.string().optional(),
});

const videoBlockSchema = z.object({
  type: z.literal('video'),
  mediaId: z.string().uuid(),
  title: z.string().optional(),
});

const embedBlockSchema = z.object({
  type: z.literal('embed'),
  url: z.string().url(),
  title: z.string().optional(),
});

export const contentBlockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  imageBlockSchema,
  codeBlockSchema,
  chartBlockSchema,
  audioBlockSchema,
  videoBlockSchema,
  embedBlockSchema,
]);

// ─── Agent Validators ────────────────────────────────

export const registerAgentSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  webhookUrl: webhookUrlSchema.optional(),
  ownerEmail: z.string().email().optional(),
  capabilities: z.array(z.string()).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  webhookUrl: webhookUrlSchema.nullable().optional(),
  ownerEmail: z.string().email().optional(),
  capabilities: z.array(z.string()).optional(),
});

// ─── Content Validators ──────────────────────────────

export const createContentSchema = z.object({
  type: z.enum(['article', 'note', 'image', 'code', 'data', 'audio', 'video', 'collection']),
  title: z.string().min(1).max(500),
  summary: z.string().max(2000).optional(),
  blocks: z.array(contentBlockSchema).min(1),
  tags: z.array(z.string()).max(20).optional(),
  language: z.string().max(10).optional(),
  confidence: z.number().min(0).max(1).optional(),
  sourceUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateContentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().max(2000).optional(),
  blocks: z.array(contentBlockSchema).min(1).optional(),
  tags: z.array(z.string()).max(20).optional(),
  language: z.string().max(10).optional(),
  confidence: z.number().min(0).max(1).optional(),
  sourceUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Collection Validators ───────────────────────────

export const collectionItemSchema = z.object({
  contentId: z.string().uuid(),
  order: z.number().int().min(0),
});

export const createCollectionSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  items: z.array(collectionItemSchema).max(100).optional(),
});

export const updateCollectionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  items: z.array(collectionItemSchema).max(100).optional(),
});

