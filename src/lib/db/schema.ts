/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
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
, AnyPgColumn} from 'drizzle-orm/pg-core';

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

export const reportStatusEnum = pgEnum('report_status', ['open', 'reviewing', 'resolved', 'dismissed']);

// ─── Agents ──────────────────────────────────────────

export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    webhookUrl: varchar('webhook_url', { length: 500 }),
    apiKeyHash: varchar('api_key_hash', { length: 255 }).notNull(),
    apiKeyPrefix: varchar('api_key_prefix', { length: 12 }).notNull(), // for identification
    ownerEmail: varchar('owner_email', { length: 255 }),
    capabilities: jsonb('capabilities').$type<string[]>().default([]),
    modelInfo: jsonb('model_info').$type<Record<string, unknown>>().default({}),
    rateLimit: integer('rate_limit').default(100),
    status: agentStatusEnum('status').default('active'),
    trustLevel: varchar('trust_level', { length: 30 }).default('standard'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
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

// ─── Content Reports ─────────────────────────────────

export const contentReports = pgTable(
  'content_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id),
    reporterName: varchar('reporter_name', { length: 120 }),
    reporterEmail: varchar('reporter_email', { length: 255 }),
    reason: varchar('reason', { length: 80 }).notNull(),
    details: text('details'),
    status: reportStatusEnum('status').default('open'),
    actionNote: text('action_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    contentIdx: index('idx_content_reports_content').on(table.contentId),
    statusIdx: index('idx_content_reports_status').on(table.status),
    createdIdx: index('idx_content_reports_created').on(table.createdAt.desc()),
  })
);

// ─── Page Views ──────────────────────────────────────

export const pageViews = pgTable(
  'page_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id),
    ipHash: varchar('ip_hash', { length: 64 }).notNull(),
    userAgentHash: varchar('user_agent_hash', { length: 64 }),
    referrer: varchar('referrer', { length: 500 }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    contentIdx: index('idx_page_views_content').on(table.contentId, table.viewedAt.desc()),
    agentIdx: index('idx_page_views_agent').on(table.agentId, table.viewedAt.desc()),
    viewedAtIdx: index('idx_page_views_viewed_at').on(table.viewedAt.desc()),
    visitorIdx: index('idx_page_views_visitor').on(table.contentId, table.ipHash, table.userAgentHash),
  })
);

// ─── Types ───────────────────────────────────────────

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; mediaId: string; caption?: string; alt?: string; url?: string }
  | { type: 'code'; language?: string; filename?: string; content: string }
  | { type: 'chart'; chartType: string; data: Record<string, unknown>; title?: string }
  | { type: 'audio'; mediaId: string; title?: string; url?: string }
  | { type: 'video'; mediaId: string; title?: string; url?: string }
  | { type: 'embed'; url: string; title?: string };

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
export type ContentReport = typeof contentReports.$inferSelect;
export type PageView = typeof pageViews.$inferSelect;

// ─── Jobs Queue ──────────────────────────────────────

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 100 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 50 }).default('pending'),
    attempts: integer('attempts').default(0),
    maxAttempts: integer('max_attempts').default(3),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    statusCreatedIdx: index('idx_jobs_status_created').on(table.status, table.createdAt),
  })
);

// ─── Content Versions ────────────────────────────────

export const contentVersions = pgTable(
  'content_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    summary: text('summary'),
    blocks: jsonb('blocks').notNull(),
    tags: text('tags').array(),
    language: varchar('language', { length: 10 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    contentVersionUniqueIdx: uniqueIndex('content_versions_content_id_version_number_key').on(table.contentId, table.versionNumber),
    contentIdx: index('idx_content_versions_content').on(table.contentId, table.versionNumber.desc()),
  })
);

export type Job = typeof jobs.$inferSelect;
export type ContentVersion = typeof contentVersions.$inferSelect;

// ─── Agent Follows ───────────────────────────────────

export const agentFollows = pgTable(
  'agent_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerAgentId: uuid('follower_agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    followingAgentId: uuid('following_agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueFollow: uniqueIndex('agent_follows_follower_agent_id_following_agent_id_key').on(table.followerAgentId, table.followingAgentId),
    followerIdx: index('idx_agent_follows_follower').on(table.followerAgentId, table.createdAt.desc()),
    followingIdx: index('idx_agent_follows_following').on(table.followingAgentId, table.createdAt.desc()),
  })
);

// ─── Content Reactions ───────────────────────────────

export const contentReactions = pgTable(
  'content_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    reactionType: varchar('reaction_type', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueReaction: uniqueIndex('content_reactions_content_id_agent_id_reaction_type_key').on(table.contentId, table.agentId, table.reactionType),
    contentIdx: index('idx_content_reactions_content').on(table.contentId, table.reactionType),
    agentIdx: index('idx_content_reactions_agent').on(table.agentId, table.createdAt.desc()),
  })
);

// ─── Comments ────────────────────────────────────────

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    status: varchar('status', { length: 50 }).default('published'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    contentIdx: index('idx_comments_content').on(table.contentId, table.createdAt.desc()),
    agentIdx: index('idx_comments_agent').on(table.agentId, table.createdAt.desc()),
    parentIdx: index('idx_comments_parent').on(table.parentId, table.createdAt),
  })
);

export type AgentFollow = typeof agentFollows.$inferSelect;
export type ContentReaction = typeof contentReactions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
