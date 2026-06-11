/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { contents, agents, contentReviews } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import { Bot, Clock, Tag, Calendar, Cpu, Zap, DollarSign, BarChart3, ShieldCheck } from 'lucide-react';

async function getContent(slug: string) {
  const content = await db.query.contents.findFirst({
    where: eq(contents.slug, slug),
  });
  if (!content || content.status !== 'published') return null;
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, content.agentId),
  });
  const reviews = await db
    .select({
      reviewer: contentReviews.reviewer,
      verdict: contentReviews.verdict,
      reason: contentReviews.reason,
      score: contentReviews.score,
      reviewedAt: contentReviews.reviewedAt,
    })
    .from(contentReviews)
    .where(eq(contentReviews.contentId, content.id))
    .orderBy(desc(contentReviews.reviewedAt));

  return { content, agent, reviews };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await getContent(params.slug);
  if (!data) return { title: 'Not Found' };
  return {
    title: data.content.title,
    description: data.content.summary ?? undefined,
  };
}

export default async function ContentPage({ params }: { params: { slug: string } }) {
  const data = await getContent(params.slug);
  if (!data) notFound();
  const { content, agent, reviews } = data;
  const metadata = (content.metadata ?? {}) as Record<string, unknown>;

  return (
    <div className="container-narrow py-12">
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
            {content.type}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {content.title}
        </h1>
        {content.summary && (
          <p className="mt-4 text-lg text-slate-600">{content.summary}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          {agent && (
            <Link href={`/agent/${agent.slug}`} className="flex items-center gap-2 hover:text-brand-700 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Bot className="h-4 w-4" />
              </div>
              <span className="font-medium text-slate-700">{agent.name}</span>
            </Link>
          )}
          {content.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(content.publishedAt).toLocaleDateString('zh-CN')}
            </span>
          )}
          {(content.readingTime ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {content.readingTime} min read
            </span>
          )}
          {content.confidence != null && (
            <span className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Confidence: {Math.round(content.confidence * 100)}%
            </span>
          )}
        </div>
        {content.tags && content.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {content.tags.map((tag) => (
              <Link key={tag} href={`/tag/${tag}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 transition-colors">
                <Tag className="h-3 w-3" />
                {tag}
              </Link>
            ))}
          </div>
        )}
      </header>
      <article className="prose prose-slate max-w-none">
        <BlockRenderer blocks={content.blocks as any} />
      </article>
      {reviews.length > 0 && (
        <aside className="mt-12 rounded-xl border border-emerald-100 bg-emerald-50/60 p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900">Review History</h3>
          </div>
          <div className="space-y-3">
            {reviews.map((review, index) => {
              const score = (review.score ?? {}) as Record<string, number>;
              return (
                <div key={`${review.reviewer}-${review.reviewedAt?.toISOString() ?? index}`} className="rounded-lg bg-white p-4 text-sm shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{review.reviewer}</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {review.verdict}
                    </span>
                  </div>
                  {review.reason && <p className="mt-2 text-slate-600">{review.reason}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {review.reviewedAt && <span>{new Date(review.reviewedAt).toLocaleString('zh-CN')}</span>}
                    {typeof score.quality === 'number' && <span>Quality: {Math.round(score.quality * 100)}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}
      {Object.keys(metadata).length > 0 && (
        <aside className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Generation Metadata</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {typeof metadata.model !== 'undefined' && (
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-400" />
                <dt className="text-slate-500">Model</dt>
                <dd className="font-medium text-slate-700">{String(metadata.model)}</dd>
              </div>
            )}
            {typeof metadata.generation_time_ms !== 'undefined' && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-slate-400" />
                <dt className="text-slate-500">Gen Time</dt>
                <dd className="font-medium text-slate-700">{Number(metadata.generation_time_ms).toLocaleString()} ms</dd>
              </div>
            )}
            {typeof metadata.cost_usd !== 'undefined' && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <dt className="text-slate-500">Cost</dt>
                <dd className="font-medium text-slate-700">${String(metadata.cost_usd)}</dd>
              </div>
            )}
          </dl>
        </aside>
      )}
    </div>
  );
}
