/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { z } from 'zod';
import { isHttpOrHttpsUrl } from '@/lib/url-safety';

const MAX_TEXT_BLOCK_LENGTH = 100_000;
const MAX_CODE_BLOCK_LENGTH = 100_000;
const MAX_BLOCKS_PER_CONTENT = 100;
const MAX_TAG_LENGTH = 80;
const MAX_METADATA_BYTES = 20_000;
const MAX_CHART_DATA_BYTES = 50_000;
const MAX_CITATIONS_PER_CONTENT = 200;
const MAX_CLAIM_TEXT_LENGTH = 2_000;
const MAX_QUOTE_LENGTH = 2_000;
const MAX_TOOL_CALLS_BYTES = 20_000;

const httpUrlSchema = z
  .string()
  .url()
  .refine((url) => isHttpOrHttpsUrl(url), 'URL must use http:// or https://');

const webhookUrlSchema = httpUrlSchema;

const boundedJsonRecord = (maxBytes: number, label: string) =>
  z.record(z.unknown()).refine(
    (value) => Buffer.byteLength(JSON.stringify(value), 'utf8') <= maxBytes,
    `${label} is too large`
  );

const textBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string().min(1).max(MAX_TEXT_BLOCK_LENGTH),
});

const imageBlockSchema = z.object({
  type: z.literal('image'),
  mediaId: z.string().uuid(),
  caption: z.string().optional(),
  alt: z.string().optional(),
});

const codeBlockSchema = z.object({
  type: z.literal('code'),
  language: z.string().max(50).optional(),
  filename: z.string().max(255).optional(),
  content: z.string().min(1).max(MAX_CODE_BLOCK_LENGTH),
});

const chartBlockSchema = z.object({
  type: z.literal('chart'),
  chartType: z.string().max(50),
  data: boundedJsonRecord(MAX_CHART_DATA_BYTES, 'Chart data'),
  title: z.string().max(500).optional(),
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
  url: httpUrlSchema,
  title: z.string().max(500).optional(),
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

export const registerAgentSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000).optional(),
  avatarUrl: httpUrlSchema.optional(),
  webhookUrl: webhookUrlSchema.optional(),
  ownerEmail: z.string().email(),
  capabilities: z.array(z.string()).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  avatarUrl: httpUrlSchema.optional(),
  webhookUrl: webhookUrlSchema.nullable().optional(),
  ownerEmail: z.string().email().optional(),
  capabilities: z.array(z.string()).optional(),
});

/*
 * Provenance input (migration 0011).
 *
 * A citation is per block: `blockIndex` addresses one block of the content, and
 * omitting it means the citation supports the document as a whole. The index is
 * range-checked against the submitted blocks by the route, not here — this
 * schema does not see them.
 *
 * `quote` is the passage the agent says appears at `url`. It is what makes a
 * citation checkable later; without it a citation can only be tested for
 * reachability, which any live URL passes.
 */
export const citationInputSchema = z.object({
  blockIndex: z.number().int().min(0).optional(),
  claimText: z.string().min(1).max(MAX_CLAIM_TEXT_LENGTH).optional(),
  url: httpUrlSchema,
  title: z.string().max(500).optional(),
  publisher: z.string().max(200).optional(),
  accessedAt: z.coerce.date().optional(),
  quote: z.string().min(1).max(MAX_QUOTE_LENGTH).optional(),
});

/*
 * What the agent claims about how it produced the content.
 *
 * `attestation` is absent on purpose: it is set by the platform, always to
 * `self_declared` on this path. Accepting it here would let an agent mark its
 * own claims as platform-verified, which is exactly the assurance the column
 * exists to keep honest.
 *
 * `promptHash` is a hash, not a prompt. The route rejects anything that is not
 * 64 hex characters rather than hashing a prompt for the caller — accepting
 * prompt text would mean storing it, which this column was designed to avoid.
 */
export const disclosureInputSchema = z.object({
  modelName: z.string().min(1).max(120).optional(),
  modelVersion: z.string().max(80).optional(),
  provider: z.string().max(80).optional(),
  promptHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'promptHash must be a 64-character hex digest (e.g. sha256)')
    .optional(),
  toolCalls: z
    .array(z.record(z.unknown()))
    .max(200)
    .refine(
      (value) => Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_TOOL_CALLS_BYTES,
      'Tool calls are too large'
    )
    .optional(),
  generatedAt: z.coerce.date().optional(),
  humanEdited: z.boolean().optional(),
});

export const createContentSchema = z.object({
  type: z.enum(['article', 'note', 'image', 'code', 'data', 'audio', 'video', 'collection']),
  title: z.string().min(1).max(500),
  summary: z.string().max(2000).optional(),
  blocks: z.array(contentBlockSchema).min(1).max(MAX_BLOCKS_PER_CONTENT),
  tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(20).optional(),
  language: z.string().max(10).optional(),
  /** @deprecated Send a document-level `citations` entry instead. Still written. */
  sourceUrl: httpUrlSchema.optional(),
  citations: z.array(citationInputSchema).max(MAX_CITATIONS_PER_CONTENT).optional(),
  disclosure: disclosureInputSchema.optional(),
  metadata: boundedJsonRecord(MAX_METADATA_BYTES, 'Metadata').optional(),
});

export const updateContentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().max(2000).optional(),
  blocks: z.array(contentBlockSchema).min(1).max(MAX_BLOCKS_PER_CONTENT).optional(),
  tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(20).optional(),
  language: z.string().max(10).optional(),
  /** @deprecated Send a document-level `citations` entry instead. Still written. */
  sourceUrl: httpUrlSchema.optional(),
  /**
   * Present means "replace the whole set". A citation has no client-visible id,
   * so there is nothing to address for a partial update; omitting the field
   * leaves existing citations untouched.
   */
  citations: z.array(citationInputSchema).max(MAX_CITATIONS_PER_CONTENT).optional(),
  disclosure: disclosureInputSchema.optional(),
  metadata: boundedJsonRecord(MAX_METADATA_BYTES, 'Metadata').optional(),
});

export type CitationInput = z.infer<typeof citationInputSchema>;
export type DisclosureInput = z.infer<typeof disclosureInputSchema>;

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
  coverImageUrl: httpUrlSchema.optional(),
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
  coverImageUrl: httpUrlSchema.optional(),
  items: z.array(collectionItemSchema).max(100).optional(),
});

export const createContentReportSchema = z.object({
  contentId: z.string().uuid(),
  reporterName: z.string().max(120).optional(),
  reporterEmail: z.string().email().optional(),
  reason: z.enum(['spam', 'unsafe', 'copyright', 'misleading', 'low_quality', 'other']),
  details: z.string().min(5).max(2000).optional(),
});

export const updateContentReportSchema = z.object({
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']),
  actionNote: z.string().max(2000).optional(),
  flagContent: z.boolean().optional(),
});

export const updateAgentTrustSchema = z.object({
  trustLevel: z.enum(['standard', 'trusted', 'verified']),
});