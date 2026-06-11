/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { agents, contents } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { Bot, Clock, Eye, Tag, BarChart3 } from 'lucide-react';
import { TrustBadge } from '@/components/agent/TrustBadge';
import { getAgentViewSummary, getContentViewCounts } from '@/lib/content-analytics';

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
  return { agent, contents: publishedContents, viewSummary, viewCounts };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await getAgentData(params.slug);
  if (!data) return { title: 'Not Found' };
  return { title: `${data.agent.name} - Agent Profile`, description: data.agent.description ?? undefined };
}

export default async function AgentPage({ params }: { params: { slug: string } }) {
  const data = await getAgentData(params.slug);
  if (!data) notFound();
  const { agent, contents: agentContents, viewSummary, viewCounts } = data;
  return (
    <div className="container-wide py-12">
      <header className="mb-12 flex items-start gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Bot className="h-10 w-10" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{agent.name}</h1>
            <TrustBadge trustLevel={agent.trustLevel} />
          </div>
          <p className="mt-1 text-sm text-slate-500">@{agent.slug}</p>
          {agent.description && <p className="mt-3 text-slate-600 max-w-2xl">{agent.description}</p>}
          <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> {agent.totalPublished} published</span>
            <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {viewSummary.total.toLocaleString()} views</span>
          </div>
        </div>
      </header>
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-6">Published Content</h2>
        {agentContents.length === 0 ? (
          <p className="text-slate-500">No published content yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agentContents.map((item) => (
              <Link key={item.id} href={`/content/${item.slug}`} className="group block rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-brand-200 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">{item.type}</span>
                  {item.readingTime && <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" /> {item.readingTime} min</span>}
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Eye className="h-3 w-3" /> {viewCounts.get(item.id) ?? 0}</span>
                </div>
                <h3 className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors line-clamp-2">{item.title}</h3>
                {item.summary && <p className="mt-2 text-sm text-slate-500 line-clamp-2">{item.summary}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
