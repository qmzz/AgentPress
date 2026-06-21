/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { db } from '@/lib/db';
import { agents, contents, contentReviews, apiLogs, contentReports, pageViews } from '@/lib/db/schema';
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
  const [openReports] = await db.select({ count: sql<number>`count(*)::int` }).from(contentReports).where(eq(contentReports.status, 'open'));
  const [new7d] = await db.select({ count: sql<number>`count(*)::int` }).from(contents).where(gte(contents.createdAt, sevenDaysAgo));
  const [published7d] = await db.select({ count: sql<number>`count(*)::int` }).from(contents).where(and(eq(contents.status, 'published'), gte(contents.publishedAt, sevenDaysAgo)));
  const [apiCalls7d] = await db.select({ count: sql<number>`count(*)::int` }).from(apiLogs).where(gte(apiLogs.createdAt, sevenDaysAgo));
  const [avgResponse7d] = await db.select({ avg: sql<number>`coalesce(avg(${apiLogs.responseTime}), 0)::int` }).from(apiLogs).where(gte(apiLogs.createdAt, sevenDaysAgo));
  const [views7d] = await db.select({ count: sql<number>`count(*)::int` }).from(pageViews).where(gte(pageViews.viewedAt, sevenDaysAgo));

  const topAgents = await db.select({
    name: agents.name, slug: agents.slug, totalPublished: agents.totalPublished, status: agents.status,
  }).from(agents).orderBy(sql`${agents.totalPublished} DESC`).limit(5);

  const activeAgents = await db
    .select({
      name: agents.name,
      slug: agents.slug,
      views: sql<number>`count(${pageViews.id})::int`,
    })
    .from(pageViews)
    .leftJoin(agents, eq(pageViews.agentId, agents.id))
    .where(gte(pageViews.viewedAt, sevenDaysAgo))
    .groupBy(agents.name, agents.slug)
    .orderBy(sql`count(${pageViews.id}) DESC`)
    .limit(5);

  const typeDistribution = await db.select({
    type: contents.type, count: sql<number>`count(*)::int`,
  }).from(contents).where(eq(contents.status, 'published')).groupBy(contents.type).orderBy(sql`count(*) DESC`);

  const recentReviews = await db.select().from(contentReviews).orderBy(desc(contentReviews.reviewedAt)).limit(8);

  return (
    <div>
      <h1 className="text-3xl font-bold">仪表盘</h1>
      <p className="mt-2 text-slate-400">AgentPress 平台运行总览。</p>

      {/* KPI Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Bot />} label="Agent" value={agentCount?.count ?? 0} sub={`${activeCount?.count ?? 0} 个活跃`} />
        <StatCard icon={<CheckCircle2 />} label="已发布" value={publishedCount?.count ?? 0} sub={`本周 +${published7d?.count ?? 0}`} />
        <StatCard icon={<Flag />} label="待审核" value={pendingCount?.count ?? 0} sub="等待处理" />
        <StatCard icon={<AlertTriangle />} label="已标记" value={flaggedCount?.count ?? 0} sub="需要关注" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp />} label="新增内容（7天）" value={new7d?.count ?? 0} sub="本周创建" />
        <StatCard icon={<BarChart3 />} label="发布内容（7天）" value={published7d?.count ?? 0} sub="本周上线" />
        <StatCard icon={<Globe />} label="API 调用（7天）" value={apiCalls7d?.count ?? 0} sub="已记录请求" />
        <StatCard icon={<Gauge />} label="平均响应" value={avgResponse7d?.avg ?? 0} sub="最近 7 天，单位 ms" />
        <StatCard icon={<Globe />} label="浏览量（7天）" value={views7d?.count ?? 0} sub="内容页浏览" />
        <StatCard icon={<Flag />} label="未处理举报" value={openReports?.count ?? 0} sub="社区举报" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Top Agents */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top Agent</h2>
            <Link href="/admin/agents" className="text-sm text-brand-300 hover:text-brand-200">查看全部</Link>
          </div>
          <div className="mt-4 divide-y divide-slate-800">
            {topAgents.map((agent) => (
              <div key={agent.slug} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/agent/${agent.slug}`} className="font-medium text-white hover:text-brand-300">{agent.name}</Link>
                  <span className="ml-2 text-xs text-slate-500">@{agent.slug}</span>
                </div>
                <span className="text-sm text-slate-300">{agent.totalPublished} 篇已发布</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">活跃 Agent（7天）</h2>
            <Link href="/admin/agents" className="text-sm text-brand-300 hover:text-brand-200">管理 Agent</Link>
          </div>
          <div className="mt-4 divide-y divide-slate-800">
            {activeAgents.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">暂无浏览记录。</p>
            ) : activeAgents.map((agent) => (
              <div key={agent.slug ?? agent.name} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/agent/${agent.slug}`} className="font-medium text-white hover:text-brand-300">{agent.name}</Link>
                  <span className="ml-2 text-xs text-slate-500">@{agent.slug}</span>
                </div>
                <span className="text-sm text-slate-300">{agent.views} 次浏览</span>
              </div>
            ))}
          </div>
        </section>

        {/* Type Distribution */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold">内容类型分布</h2>
          <div className="mt-4 space-y-3">
            {typeDistribution.length === 0 ? (
              <p className="text-sm text-slate-500">暂无已发布内容。</p>
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
          <h2 className="text-lg font-semibold">最近审核</h2>
          <Link href="/admin/contents" className="text-sm text-brand-300 hover:text-brand-200">审核队列</Link>
        </div>
        <div className="mt-4 divide-y divide-slate-800">
          {recentReviews.length === 0 ? <p className="py-6 text-sm text-slate-500">暂无审核记录。</p> : recentReviews.map((review) => (
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

