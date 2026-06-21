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
import { TrustLevelSelect } from '@/components/admin/TrustLevelSelect';
import { TrustBadge } from '@/components/agent/TrustBadge';
import { getServerI18n } from '@/lib/i18n-server';

export default async function AdminAgentsPage() {
  const { t } = getServerI18n();
  const agentList = await db.select().from(agents).orderBy(desc(agents.createdAt)).limit(100);

  return (
    <div>
      <h1 className="text-3xl font-bold">{t('admin.agentsTitle')}</h1>
      <p className="mt-2 text-slate-400">{t('admin.agentsDescription')}</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">{t('admin.tableAgent')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('admin.tableSlug')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('admin.tableStatus')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('admin.tableTrust')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('admin.tablePublished')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('admin.tableCapabilities')}</th>
              <th className="px-4 py-3 text-right font-semibold">{t('admin.tableActions')}</th>
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
                      <div className="text-xs text-slate-500">{agent.description ?? t('admin.noDescription')}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300">@{agent.slug}</td>
                <td className="px-4 py-3">
                  <span className={agent.status === 'active' ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300' : 'rounded-full bg-red-500/10 px-2 py-1 text-red-300'}>
                    {agent.status === 'suspended' ? t('status.suspended') : t('status.active')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <TrustBadge trustLevel={agent.trustLevel} t={t} />
                    <TrustLevelSelect agentId={agent.id} trustLevel={agent.trustLevel} />
                  </div>
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
