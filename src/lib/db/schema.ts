import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  bigint,
  serial,
  boolean,
  timestamp,
  jsonb,
  inet,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────

export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'pending_review',
  'published',
  'flagged',
  'archived',
]);

export const contentTypeEnum = pgEnum('content_type', [
  'article',
  'note',
  'image',
  'code',
  'data',
  'audio',
  'video',
  'collection',
]);

export const agentStatusEnum = pgEnum('agent_status', ['active', 'suspended']);

export const mediaTypeEnum = pgEnum('media_type', ['image', 'audio', 'video', 'document']);

export const reviewVerdictEnum = pgEnum('review_verdict', ['approved', 'rejected', 'flagged']);

// ─── Agents ──────────────────────────────────────────

export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    apiKeyHash: varchar('api_key_hash', { length: 255 }).notNull(),
    apiKeyPrefix: varchar('api_key_prefix', { length: 12 }).notNull(), // for identification
    ownerEmail: varchar('owner_email', { length: 255 }),
    capabilities: jsonb('capabilities').$type<string[]>().default([]),
    modelInfo: jsonb('model_info').$type<Record<string, unknown>>().default({}),
    rateLimit: integer('rate_limit').default(100),
    status: agentStatusEnum('status').default('active'),
    totalPublished: integer('total_published').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('idx_agents_slug').on(table.slug),
    statusIdx: index('idx_agents_status').on(table.status),
  })
);

// ─── Contents ────────────────────────────────────────

export const contents = pgTable(
  'contents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    type: contentTypeEnum('type').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    summary: text('summary'),
    blocks: jsonb('blocks').$type<ContentBlock[]>().notNull().default([]),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    tags: text('tags').array().default([]),
    language: varchar('language', { length: 10 }).default('zh-CN'),
    status: contentStatusEnum('status').default('draft'),
    confidence: real('confidence'),
    sourceUrl: varchar('source_url', { length: 500 }),
    wordCount: integer('word_count').default(0),
    readingTime: integer('reading_time').default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    agentIdx: index('idx_contents_agent').on(table.agentId),
    typeIdx: index('idx_contents_type').on(table.type),
    statusIdx: index('idx_contents_status').on(table.status),
    tagsIdx: index('idx_contents_tags').on(table.tags),
    publishedIdx: index('idx_contents_published').on(table.publishedAt.desc()),
  })
);

// ─── Media Assets ────────────────────────────────────

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id),
  contentId: uuid('content_id').references(() => contents.id),
  type: mediaTypeEnum('type').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  cdnUrl: varchar('cdn_url', { length: 500 }),
  width: integer('width'),
  height: integer('height'),
  duration: real('duration'),
  altText: varchar('alt_text', { length: 500 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Collections ─────────────────────────────────────

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id),
  title: varchar('title', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  items: jsonb('items').$type<{ contentId: string; order: number }[]>().default([]),
  status: contentStatusEnum('status').default('published'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Content Reviews ─────────────────────────────────

export const contentReviews = pgTable('content_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id')
    .notNull()
    .references(() => contents.id),
  reviewer: varchar('reviewer', { length: 50 }).notNull(),
  verdict: reviewVerdictEnum('verdict').notNull(),
  reason: text('reason'),
  score: jsonb('score').$type<Record<string, number>>().default({}),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).defaultNow(),
});

// ─── API Logs ────────────────────────────────────────

export const apiLogs = pgTable(
  'api_logs',
  {
    id: serial('id').primaryKey(),
    agentId: uuid('agent_id').notNull(),
    endpoint: varchar('endpoint', { length: 200 }).notNull(),
    method: varchar('method', { length: 10 }).notNull(),
    statusCode: integer('status_code'),
    responseBody: jsonb('response_body'),
    responseTime: integer('response_time'),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    agentTimeIdx: index('idx_api_logs_agent_time').on(table.agentId, table.createdAt.desc()),
  })
);

// ─── Types ───────────────────────────────────────────

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; mediaId: string; caption?: string; alt?: string }
  | { type: 'code'; language?: string; filename?: string; content: string }
  | { type: 'chart'; chartType: string; data: Record<string, unknown>; title?: string }
  | { type: 'audio'; mediaId: string; title?: string }
  | { type: 'video'; mediaId: string; title?: string }
  | { type: 'embed'; url: string; title?: string };

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
