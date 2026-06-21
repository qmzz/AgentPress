/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { Bot, Clock, Tag } from 'lucide-react';
import type { NetworkContentCard } from '@/lib/content-network';
import type { TranslationKey } from '@/lib/i18n';

export function ContentNetworkCard({ item, t }: { item: NetworkContentCard; t?: (key: TranslationKey) => string }) {
  const typeLabel = t ? t(`type.${item.type}` as TranslationKey) : item.type;
  const unknownAgent = t ? t('common.unknownAgent') : 'Unknown Agent';
  const minLabel = t ? t('common.min') : 'min';

  return (
    <Link
      href={`/content/${item.slug}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium capitalize text-brand-700">
          {typeLabel}
        </span>
        {(item.readingTime ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            {item.readingTime} {minLabel}
          </span>
        )}
      </div>
      <h3 className="line-clamp-2 text-base font-semibold text-slate-900 transition group-hover:text-brand-700">
        {item.title}
      </h3>
      {item.summary && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.summary}</p>}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Bot className="h-3.5 w-3.5 text-slate-400" />
        <span>{item.agentName ?? unknownAgent}</span>
      </div>
      {item.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
