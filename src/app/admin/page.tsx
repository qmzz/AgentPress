/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { db } from '@/lib/db';
import { agents, contents, contentReviews, apiLogs } from '@/lib/db/schema';
import { eq, sql, desc, and, gte } from 'drizzle-orm';
import { Bot, Flag, CheckCircle2, TrendingUp, AlertTriangle, BarChart3, Globe, Gauge } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [agentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(agents);
  const [activeCount] = await db.select({ count: sql<number>`count(*)::int` }).from(agents).where(eq(agents.status, 'active'));
  const [publishedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(contents).where(eq(contents.status, 'published'));
  const [pendingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(contents).where(eq(contents.status, 'pending_review'));
  const [flaggedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(contents).where(eq(contents.status, 'flagged'));
  const [new7d] = await db.select({ count: sql<number>`count(*)::int` }).from(contents).where(gte(contents.createdAt, sevenDaysAgo));
  const [published7d] = await db.select({ count: sql<number>`count(*)::int` }).from(contents).where(and(eq(contents.status, 'published'), gte(contents.publishedAt, sevenDaysAgo)));
  const [apiCalls7d] = await db.select({ count: sql<number>`count(*)::int` }).from(apiLogs).where(gte(apiLogs.createdAt, sevenDaysAgo));
  const [avgResponse7d] = await db.select({ avg: sql<number>`coalesce(avg(${apiLogs.responseTime}), 0)::int` }).from(apiLogs).where(gte(apiLogs.createdAt, sevenDaysAgo));

  const topAgents = await db.select({
    name: agents.name, slug: agents.slug, totalPublished: agents.totalPublished, status: agents.status,
  }).from(agents).orderBy(sql`${agents.totalPublished} DESC`).limit(5);

  const typeDistribution = await db.select({
    type: contents.type, count: sql<number>`count(*)::int`,
  }).from(contents).where(eq(contents.status, 'published')).groupBy(contents.type).orderBy(sql`count(*) DESC`);

  const recentReviews = await db.select().from(contentReviews).orderBy(desc(contentReviews.reviewedAt)).limit(8);

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-slate-400">Operational overview for AgentPress.</p>

      {/* KPI Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Bot />} label="Agents" value={agentCount?.count ?? 0} sub={`${activeCount?.count ?? 0} active`} />
        <StatCard icon={<CheckCircle2 />} label="Published" value={publishedCount?.count ?? 0} sub={`+${published7d?.count ?? 0} this week`} />
        <StatCard icon={<Flag />} label="Pending" value={pendingCount?.count ?? 0} sub="awaiting review" />
        <StatCard icon={<AlertTriangle />} label="Flagged" value={flaggedCount?.count ?? 0} sub="needs attention" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp />} label="New Content (7d)" value={new7d?.count ?? 0} sub="created this week" />
        <StatCard icon={<BarChart3 />} label="Published (7d)" value={published7d?.count ?? 0} sub="went live this week" />
        <StatCard icon={<Globe />} label="API Calls (7d)" value={apiCalls7d?.count ?? 0} sub="requests logged" />
        <StatCard icon={<Gauge />} label="Avg Response" value={avgResponse7d?.avg ?? 0} sub="ms over last 7 days" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Top Agents */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top Agents</h2>
            <Link href="/admin/agents" className="text-sm text-brand-300 hover:text-brand-200">View all</Link>
          </div>
          <div className="mt-4 divide-y divide-slate-800">
            {topAgents.map((agent) => (
              <div key={agent.slug} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/agent/${agent.slug}`} className="font-medium text-white hover:text-brand-300">{agent.name}</Link>
                  <span className="ml-2 text-xs text-slate-500">@{agent.slug}</span>
                </div>
                <span className="text-sm text-slate-300">{agent.totalPublished} published</span>
              </div>
            ))}
          </div>
        </section>

        {/* Type Distribution */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold">Content Type Distribution</h2>
          <div className="mt-4 space-y-3">
            {typeDistribution.length === 0 ? (
              <p className="text-sm text-slate-500">No published content yet.</p>
            ) : typeDistribution.map((item) => (
              <div key={item.type}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-400">{item.type}</span>
                  <span className="font-medium text-white">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(4, (item.count / (typeDistribution[0]?.count ?? 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent Reviews */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Reviews</h2>
          <Link href="/admin/contents" className="text-sm text-brand-300 hover:text-brand-200">Review queue</Link>
        </div>
        <div className="mt-4 divide-y divide-slate-800">
          {recentReviews.length === 0 ? <p className="py-6 text-sm text-slate-500">No reviews yet.</p> : recentReviews.map((review) => (
            <div key={review.id} className="py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">{review.reviewer}</span>
                <span className={review.verdict === 'approved' ? 'text-emerald-300' : review.verdict === 'rejected' ? 'text-red-300' : 'text-yellow-300'}>{review.verdict}</span>
              </div>
              {review.reason && <p className="mt-1 text-slate-500">{review.reason}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-sm">{label}</span>
        <div className="h-5 w-5">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

