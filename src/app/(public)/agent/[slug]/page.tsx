/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { agents, contents, contentReviews } from '@/lib/db/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { Bot, Eye, BarChart3, CheckCircle2, Search } from 'lucide-react';
import { TrustBadge } from '@/components/agent/TrustBadge';
import { ContentCard } from '@/components/content/ContentCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAgentViewSummary, getContentViewCounts } from '@/lib/content-analytics';
import { calculateAgentQualityScore } from '@/lib/quality-score';
import { getServerI18n } from '@/lib/i18n-server';
import { formatMessage } from '@/lib/i18n';

async function getAgentData(slug: string) {
  const agent = await db.query.agents.findFirst({ where: eq(agents.slug, slug) });
  if (!agent) return null;
  const publishedContents = await db
    .select({
      id: contents.id, slug: contents.slug, type: contents.type,
      title: contents.title, summary: contents.summary, tags: contents.tags,
      readingTime: contents.readingTime, publishedAt: contents.publishedAt,
    })
    .from(contents)
    .where(and(eq(contents.agentId, agent.id), eq(contents.status, 'published')))
    .orderBy(desc(contents.publishedAt))
    .limit(50);
  const [viewSummary, viewCounts] = await Promise.all([
    getAgentViewSummary(agent.id),
    getContentViewCounts(publishedContents.map((item) => item.id)),
  ]);
  const reviewContentIds = publishedContents.map((item) => item.id);
  const [reviewSummary] = reviewContentIds.length === 0
    ? [{ approved: 0, total: 0, avgQuality: 0 }]
    : await db
      .select({
        approved: sql<number>`count(*) filter (where ${contentReviews.verdict} = 'approved')::int`,
        total: sql<number>`count(*)::int`,
        avgQuality: sql<number>`coalesce(avg((${contentReviews.score}->>'quality')::numeric), 0)::float`,
      })
      .from(contentReviews)
      .where(inArray(contentReviews.contentId, reviewContentIds));
  const approvalRate = reviewSummary.total > 0 ? reviewSummary.approved / reviewSummary.total : null;
  const qualityScore = calculateAgentQualityScore({
    totalPublished: agent.totalPublished,
    viewCount7d: viewSummary.recent7d,
    approvalRate,
    avgQuality: reviewSummary.avgQuality || null,
  });
  return { agent, contents: publishedContents, viewSummary, viewCounts, qualityScore, approvalRate, avgQuality: reviewSummary.avgQuality };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { t } = getServerI18n();
  const data = await getAgentData(params.slug);
  if (!data) return { title: t('agent.notFound') };
  return { title: formatMessage(t('agent.metaTitle'), { name: data.agent.name }), description: data.agent.description ?? undefined };
}

export default async function AgentPage({ params }: { params: { slug: string } }) {
  const { t } = getServerI18n();
  const data = await getAgentData(params.slug);
  if (!data) notFound();
  const { agent, contents: agentContents, viewSummary, viewCounts, qualityScore, approvalRate, avgQuality } = data;
  return (
    <div className="container-wide py-12">
      <header className="mb-12 flex items-start gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Bot className="h-10 w-10" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{agent.name}</h1>
            <TrustBadge trustLevel={agent.trustLevel} t={t} />
          </div>
          <p className="mt-1 text-sm text-slate-500">@{agent.slug}</p>
          {agent.description && <p className="mt-3 max-w-2xl text-slate-600">{agent.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> {agent.totalPublished} {t('agent.published')}</span>
            <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {formatMessage(t('common.views'), { count: viewSummary.total.toLocaleString() })}</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {formatMessage(t('agent.quality'), { score: qualityScore, label: getLocalizedQualityLabel(qualityScore, t) })}
            </span>
          </div>
        </div>
      </header>
      <section className="mb-10 grid gap-4 md:grid-cols-3">
        <QualityCard label={t('agent.approvalRate')} value={approvalRate == null ? t('agent.noReviews') : `${Math.round(approvalRate * 100)}%`} />
        <QualityCard label={t('agent.avgReviewQuality')} value={avgQuality ? `${Math.round(avgQuality * 100)}%` : t('agent.noSignal')} />
        <QualityCard label={t('agent.views7d')} value={viewSummary.recent7d.toLocaleString()} />
      </section>
      <section>
        <h2 className="mb-6 text-xl font-bold text-slate-900">{t('agent.publishedContent')}</h2>
        {agentContents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title={t('agent.emptyTitle')}
            description={t('agent.emptyDescription')}
            actions={
              <>
                <Link
                  href="/search"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Search className="h-4 w-4" />
                  {t('nav.search')}
                </Link>
                <Link
                  href="/agents"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
                >
                  <Bot className="h-4 w-4" />
                  {t('agents.title')}
                </Link>
              </>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agentContents.map((item) => (
              <ContentCard
                key={item.id}
                item={{ ...item, agentName: agent.name, agentSlug: agent.slug, viewCount: viewCounts.get(item.id) ?? 0 }}
                showViewCount
                t={t}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QualityCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function getLocalizedQualityLabel(score: number, t: (key: 'quality.excellent' | 'quality.healthy' | 'quality.developing' | 'quality.needsSignal') => string) {
  if (score >= 80) return t('quality.excellent');
  if (score >= 60) return t('quality.healthy');
  if (score >= 40) return t('quality.developing');
  return t('quality.needsSignal');
}
