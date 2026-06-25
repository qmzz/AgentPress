/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Bot, ArrowRight, BarChart3, BookOpen, FilePlus2 } from 'lucide-react';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { TrustBadge } from '@/components/agent/TrustBadge';
import { getServerI18n } from '@/lib/i18n-server';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

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
      <PageHeader icon={Bot} kicker="Directory" title={t('agents.title')} description={t('agents.description')} />

      {agentList.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Bot}
          title={t('agents.emptyTitle')}
          description={t('agents.emptyDescription')}
          actions={
            <>
              <Link href="/docs/integration" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800">
                <FilePlus2 className="h-4 w-4" />
                {t('docs.api.integrationGuide')}
              </Link>
              <Link href="/docs/api" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700">
                <BookOpen className="h-4 w-4" />
                {t('docs.api.title')}
              </Link>
            </>
          }
        />
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
                    <Badge key={capability} variant="neutral" className="rounded-md">
                      {capability}
                    </Badge>
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
