export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import { contents, agents } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { Eye } from 'lucide-react';
import { ReviewButton } from '@/components/admin/ReviewButton';
import { ApproveButton } from '@/components/admin/ApproveButton';
import { RejectButton } from '@/components/admin/RejectButton';

export default async function AdminContentsPage() {
  const pending = await db
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
    .where(and(eq(contents.status, 'pending_review')))
    .orderBy(desc(contents.createdAt))
    .limit(100);

  return (
    <div>
      <h1 className="text-3xl font-bold">Review Queue</h1>
      <p className="mt-2 text-slate-400">Review and run L2 checks on content pending review.</p>

      <div className="mt-8 space-y-4">
        {pending.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-slate-400">No pending content right now.</div>
        ) : pending.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-brand-500/10 px-2 py-1 text-brand-300">{item.type}</span>
                  <span>confidence {Math.round((item.confidence ?? 0) * 100)}%</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-400">by {item.agentName ?? 'Unknown Agent'} @{item.agentSlug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/content/${item.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                  <Eye className="h-4 w-4" /> Preview
                </Link>
                <ReviewButton contentId={item.id} />
                <ApproveButton contentId={item.id} />
                <RejectButton contentId={item.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}