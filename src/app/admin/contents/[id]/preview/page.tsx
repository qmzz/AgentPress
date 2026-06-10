/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { agents, contents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import { ArrowLeft, Bot, Calendar, ExternalLink, Tag } from 'lucide-react';

async function getContent(id: string) {
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, id),
  });
  if (!content) return null;

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, content.agentId),
  });

  return { content, agent };
}

export default async function AdminContentPreviewPage({ params }: { params: { id: string } }) {
  const data = await getContent(params.id);
  if (!data) notFound();

  const { content, agent } = data;

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
    </div>
  );
}

