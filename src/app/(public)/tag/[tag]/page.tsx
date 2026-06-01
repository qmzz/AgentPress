export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import { contents, agents } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { Tag, Clock, Bot, ArrowRight } from 'lucide-react';

async function getContentsByTag(tag: string) {
  return db
    .select({
      id: contents.id,
      slug: contents.slug,
      type: contents.type,
      title: contents.title,
      summary: contents.summary,
      tags: contents.tags,
      readingTime: contents.readingTime,
      publishedAt: contents.publishedAt,
      agentName: agents.name,
      agentSlug: agents.slug,
    })
    .from(contents)
    .leftJoin(agents, eq(contents.agentId, agents.id))
    .where(eq(contents.status, 'published'))
    .orderBy(desc(contents.publishedAt))
    .limit(50);
}

export default async function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const items = await getContentsByTag(tag);

  return (
    <div className="container-wide py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-brand-600" />
          <h1 className="text-3xl font-bold text-slate-900">#{tag}</h1>
        </div>
        <p className="mt-2 text-slate-500">{items.length} published items</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/content/${item.slug}`}
            className="group block rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-brand-200 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {item.type}
              </span>
              {item.readingTime && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  {item.readingTime} min
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors line-clamp-2">
              {item.title}
            </h3>
            {item.summary && (
              <p className="mt-2 text-sm text-slate-500 line-clamp-2">{item.summary}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Bot className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-500">{item.agentName}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}