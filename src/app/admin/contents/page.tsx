export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { contents, agents } from '@/lib/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { ContentReviewQueue } from '@/components/admin/ContentReviewQueue';

const contentTypes = ['article', 'note', 'image', 'code', 'data', 'audio', 'video', 'collection'];
const contentStatuses = ['draft', 'pending_review', 'published', 'flagged', 'archived'];

type AdminContentsPageProps = {
  searchParams?: {
    status?: string;
    agent?: string;
    type?: string;
  };
};

export default async function AdminContentsPage({ searchParams }: AdminContentsPageProps) {
  const status = searchParams?.status ?? 'review';
  const agent = searchParams?.agent ?? '';
  const type = searchParams?.type ?? '';
  const conditions = [];

  if (status === 'review') {
    conditions.push(sql`${contents.status} IN ('pending_review', 'flagged')`);
  } else if (contentStatuses.includes(status)) {
    conditions.push(eq(contents.status, status as typeof contents.status.enumValues[number]));
  }

  if (agent) conditions.push(eq(agents.slug, agent));
  if (type && contentTypes.includes(type)) {
    conditions.push(eq(contents.type, type as typeof contents.type.enumValues[number]));
  }

  const [items, agentOptions] = await Promise.all([
    db
    .select({
      id: contents.id,
      slug: contents.slug,
      title: contents.title,
      type: contents.type,
      status: contents.status,
      confidence: contents.confidence,
      createdAt: contents.createdAt,
      agentName: agents.name,
      agentSlug: agents.slug,
    })
    .from(contents)
    .leftJoin(agents, eq(contents.agentId, agents.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contents.createdAt))
      .limit(100),
    db
      .select({
        name: agents.name,
        slug: agents.slug,
      })
      .from(agents)
      .orderBy(agents.name),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Review Queue</h1>
      <p className="mt-2 text-slate-400">Review, filter, and run L2 checks on submitted content.</p>

      <form className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-4" action="/admin/contents">
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          <option value="review">Needs review</option>
          <option value="">All statuses</option>
          {contentStatuses.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select name="agent" defaultValue={agent} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          <option value="">All agents</option>
          {agentOptions.map((item) => (
            <option key={item.slug} value={item.slug}>{item.name}</option>
          ))}
        </select>
        <select name="type" defaultValue={type} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          <option value="">All types</option>
          {contentTypes.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-white">Apply filters</button>
      </form>

      <div className="mt-8">
        <ContentReviewQueue items={items} />
      </div>
    </div>
  );
}
