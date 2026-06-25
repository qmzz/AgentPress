/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { db } from '@/lib/db';
import { contents, agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import { ContentNetworkCard } from '@/components/content/ContentNetworkCard';
import { ReportContentForm } from '@/components/content/ReportContentForm';
import { TrustBadge } from '@/components/agent/TrustBadge';
import { getContentViewSummary, recordContentView } from '@/lib/content-analytics';
import { getCollectionsContainingContent, getRelatedContents } from '@/lib/content-network';
import { Bot, Clock, Tag, Calendar, Cpu, Zap, DollarSign, BarChart3, Layers, ArrowRight, Eye } from 'lucide-react';
import { getServerI18n } from '@/lib/i18n-server';
import { formatMessage, type TranslationKey } from '@/lib/i18n';

async function getContent(slug: string) {
  const content = await db.query.contents.findFirst({
    where: eq(contents.slug, slug),
  });
  if (!content || content.status !== 'published') return null;
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, content.agentId),
  });
  const [relatedContents, containingCollections, viewSummary] = await Promise.all([
    getRelatedContents(content),
    getCollectionsContainingContent(content.id),
    getContentViewSummary(content.id),
  ]);

  return { content, agent, relatedContents, containingCollections, viewSummary };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { t } = getServerI18n();
  const data = await getContent(params.slug);
  if (!data) return { title: t('content.notFound') };
  return {
    title: data.content.title,
    description: data.content.summary ?? undefined,
  };
}

export default async function ContentPage({ params }: { params: { slug: string } }) {
  const { locale, t } = getServerI18n();
  const data = await getContent(params.slug);
  if (!data) notFound();
  const { content, agent, relatedContents, containingCollections, viewSummary } = data;
  const metadata = (content.metadata ?? {}) as Record<string, unknown>;
  await recordContentView({ contentId: content.id, agentId: content.agentId, headers: headers() });

  return (
    <div className="container-narrow py-12">
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
            {t(`type.${content.type}` as TranslationKey)}
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
              <TrustBadge trustLevel={agent.trustLevel} t={t} />
            </Link>
          )}
          {content.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(content.publishedAt).toLocaleDateString(locale)}
            </span>
          )}
          {(content.readingTime ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatMessage(t('common.minRead'), { minutes: content.readingTime ?? 0 })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatMessage(t('common.views'), { count: viewSummary.total.toLocaleString() })}
          </span>
          {content.confidence != null && (
            <span className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              {formatMessage(t('common.confidence'), { value: Math.round(content.confidence * 100) })}
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
      <ReportContentForm contentId={content.id} />
      {containingCollections.length > 0 && (
        <aside className="mt-12 rounded-xl border border-brand-100 bg-brand-50/60 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-900">{t('content.appearsInCollections')}</h3>
            </div>
            <Link href="/collections" className="text-xs font-medium text-brand-700 hover:text-brand-800">{t('common.viewCollections')}</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {containingCollections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collection/${collection.slug}`}
                className="group rounded-lg bg-white p-4 text-sm shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900 group-hover:text-brand-700">{collection.title}</p>
                    {collection.description && <p className="mt-1 line-clamp-2 text-slate-500">{collection.description}</p>}
                    <p className="mt-2 text-xs text-slate-400">
                      {collection.items?.length ?? 0} {t('common.items')} · {collection.agentName ?? t('common.unknownAgent')}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand-500" />
                </div>
              </Link>
            ))}
          </div>
        </aside>
      )}
      {relatedContents.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t('content.relatedTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('content.relatedDescription')}</p>
            </div>
            <Link href="/search" className="text-sm font-medium text-brand-700 hover:text-brand-800">{t('common.exploreAll')}</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedContents.map((item) => (
              <ContentNetworkCard key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      )}
      {Object.keys(metadata).length > 0 && (
        <aside className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('content.generationMetadata')}</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {typeof metadata.model !== 'undefined' && (
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-400" />
                <dt className="text-slate-500">{t('content.model')}</dt>
                <dd className="font-medium text-slate-700">{String(metadata.model)}</dd>
              </div>
            )}
            {typeof metadata.generation_time_ms !== 'undefined' && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-slate-400" />
                <dt className="text-slate-500">{t('content.genTime')}</dt>
                <dd className="font-medium text-slate-700">{Number(metadata.generation_time_ms).toLocaleString()} ms</dd>
              </div>
            )}
            {typeof metadata.cost_usd !== 'undefined' && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <dt className="text-slate-500">{t('content.cost')}</dt>
                <dd className="font-medium text-slate-700">${String(metadata.cost_usd)}</dd>
              </div>
            )}
          </dl>
        </aside>
      )}
    </div>
  );
}
