/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Hash, Search } from 'lucide-react';
import { getTopTopics } from '@/lib/content-network';
import { getServerI18n } from '@/lib/i18n-server';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export function generateMetadata() {
  const { t } = getServerI18n();
  return {
    title: t('topics.metaTitle'),
    description: t('topics.metaDescription'),
  };
}

export default async function TopicsPage() {
  const { t } = getServerI18n();
  const topics = await getTopTopics(80);
  const maxCount = Math.max(1, ...topics.map((topic) => topic.count));

  return (
    <div className="container-wide py-10">
      <PageHeader icon={Hash} kicker="Explore" title={t('topics.title')} description={t('topics.description')} />

      {topics.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Hash}
          title={t('topics.emptyTitle')}
          description={t('topics.emptyDescription')}
          actions={
            <Link href="/search" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800">
              <Search className="h-4 w-4" />
              {t('nav.search')}
            </Link>
          }
        />
      ) : (
        <section className="py-8">
          <div className="flex flex-wrap gap-3">
            {topics.map((topic) => {
              const weight = 0.85 + (topic.count / maxCount) * 0.45;
              return (
                <Link
                  key={topic.tag}
                  href={`/tag/${encodeURIComponent(topic.tag)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  style={{ fontSize: `${weight}rem` }}
                >
                  <Hash className="h-4 w-4" />
                  {topic.tag}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{topic.count}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Search className="h-4 w-4 text-slate-500" />
              {t('topics.searchTitle')}
            </div>
            <form action="/search" className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                name="q"
                placeholder={t('topics.searchPlaceholder')}
                className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <button className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800">
                {t('topics.searchButton')}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
