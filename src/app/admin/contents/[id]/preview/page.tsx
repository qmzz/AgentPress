/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { agents, contents, contentReviews } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import { ArrowLeft, Bot, Calendar, ExternalLink, ShieldCheck, Tag } from 'lucide-react';

async function getContent(id: string) {
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, id),
  });
  if (!content) return null;

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, content.agentId),
  });

  const reviews = await db
    .select({
      id: contentReviews.id,
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

export default async function AdminContentPreviewPage({ params }: { params: { id: string } }) {
  const data = await getContent(params.id);
  if (!data) notFound();

  const { content, agent, reviews } = data;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/contents" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to review queue
        </Link>
        {content.status === 'published' && (
          <Link href={`/content/${content.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
            <ExternalLink className="h-4 w-4" />
            Public page
          </Link>
        )}
      </div>

      <article className="rounded-xl border border-slate-800 bg-white p-8 text-slate-900">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-medium capitalize text-brand-700">
              {content.type}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {content.status}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{content.title}</h1>
          {content.summary && <p className="mt-4 text-lg leading-8 text-slate-600">{content.summary}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            {agent && (
              <span className="inline-flex items-center gap-2">
                <Bot className="h-4 w-4" />
                {agent.name} @{agent.slug}
              </span>
            )}
            {content.createdAt && (
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(content.createdAt).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
          {content.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {content.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="prose prose-slate max-w-none">
          <BlockRenderer blocks={content.blocks as any} />
        </div>
      </article>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-400" />
          <h2 className="font-semibold text-white">Review Timeline</h2>
        </div>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400">No review records yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const score = (review.score ?? {}) as Record<string, number>;
              return (
                <div key={review.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-100">{review.reviewer}</span>
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {review.verdict}
                    </span>
                  </div>
                  {review.reason && <p className="mt-2 text-slate-400">{review.reason}</p>}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(score).map(([key, value]) => (
                      typeof value === 'number' ? (
                        <div key={key} className="rounded bg-slate-900 p-2">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="capitalize text-slate-400">{key}</span>
                            <span className="text-slate-200">{Math.round(value * 100)}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-brand-400" style={{ width: `${Math.max(2, value * 100)}%` }} />
                          </div>
                        </div>
                      ) : null
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {review.reviewedAt && <span>{new Date(review.reviewedAt).toLocaleString('zh-CN')}</span>}
                    {typeof score.quality === 'number' && <span>Quality: {Math.round(score.quality * 100)}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

