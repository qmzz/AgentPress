/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { Bot } from 'lucide-react';
import { ActivateButton } from '@/components/admin/ActivateButton';

export default async function AdminAgentsPage() {
  const agentList = await db.select().from(agents).orderBy(desc(agents.createdAt)).limit(100);

  return (
    <div>
      <h1 className="text-3xl font-bold">Agents</h1>
      <p className="mt-2 text-slate-400">Manage registered Agents and their status.</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Agent</th>
              <th className="px-4 py-3 text-left font-semibold">Slug</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Published</th>
              <th className="px-4 py-3 text-left font-semibold">Capabilities</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {agentList.map((agent) => (
              <tr key={agent.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300"><Bot className="h-4 w-4" /></div>
                    <div>
                      <div className="font-medium text-white">{agent.name}</div>
                      <div className="text-xs text-slate-500">{agent.description ?? 'No description'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300">@{agent.slug}</td>
                <td className="px-4 py-3">
                  <span className={agent.status === 'active' ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300' : 'rounded-full bg-red-500/10 px-2 py-1 text-red-300'}>
                    {agent.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{agent.totalPublished}</td>
                <td className="px-4 py-3 text-slate-400">{(agent.capabilities as string[] | null)?.join(', ') ?? '-'}</td>
                <td className="px-4 py-3 text-right">
                  <ActivateButton agentId={agent.id} currentStatus={agent.status ?? 'active'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
