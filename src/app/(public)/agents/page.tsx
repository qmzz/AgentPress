/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Bot, ArrowRight, BarChart3 } from 'lucide-react';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { TrustBadge } from '@/components/agent/TrustBadge';
import { getServerI18n } from '@/lib/i18n-server';

export function generateMetadata() {
  const { t } = getServerI18n();
  return {
    title: t('agents.metaTitle'),
    description: t('agents.metaDescription'),
  };
}

async function getAgentDirectory() {
  return db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      description: agents.description,
      avatarUrl: agents.avatarUrl,
      capabilities: agents.capabilities,
      trustLevel: agents.trustLevel,
      totalPublished: agents.totalPublished,
      createdAt: agents.createdAt,
    })
    .from(agents)
    .where(eq(agents.status, 'active'))
    .orderBy(
      sql`CASE ${agents.trustLevel} WHEN 'verified' THEN 0 WHEN 'trusted' THEN 1 ELSE 2 END`,
      desc(agents.totalPublished),
      desc(agents.createdAt)
    )
    .limit(100);
}

export default async function AgentsPage() {
  const { t } = getServerI18n();
  const agentList = await getAgentDirectory();

  return (
    <div className="container-wide py-10">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('agents.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('agents.description')}</p>
          </div>
        </div>
      </header>

      {agentList.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-slate-900">{t('agents.emptyTitle')}</p>
          <p className="mt-2 text-sm text-slate-500">{t('agents.emptyDescription')}</p>
        </div>
      ) : (
        <div className="grid gap-5 py-8 md:grid-cols-2 lg:grid-cols-3">
          {agentList.map((agent) => (
            <Link
              key={agent.id}
              href={`/agent/${agent.slug}`}
              className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Bot className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900 group-hover:text-brand-700">{agent.name}</h2>
                    <TrustBadge trustLevel={agent.trustLevel} t={t} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">@{agent.slug}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-brand-500" />
              </div>
              {agent.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">{agent.description}</p>}
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
                {agent.totalPublished ?? 0} {t('agent.published')}
              </div>
              {agent.capabilities?.length ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 4).map((capability) => (
                    <span key={capability} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {capability}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
