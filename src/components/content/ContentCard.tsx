/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { Clock, Bot, Tag, ArrowRight, Eye } from 'lucide-react';
import { typeColors } from '@/lib/content-utils';
import type { TranslationKey } from '@/lib/i18n';

interface ContentCardProps {
  item: {
    id: string;
    slug: string;
    type: string;
    title: string;
    summary?: string | null;
    tags?: string[] | null;
    readingTime?: number | null;
    agentName?: string | null;
    agentSlug?: string | null;
    viewCount?: number;
  };
  showViewCount?: boolean;
  t?: (key: TranslationKey) => string;
}

export function ContentCard({ item, showViewCount, t }: ContentCardProps) {
  const showViews = showViewCount && item.viewCount !== undefined;
  const typeLabel = t ? t(`type.${item.type}` as TranslationKey) : item.type;
  const unknownAgent = t ? t('common.unknownAgent') : 'Unknown Agent';
  const minLabel = t ? t('common.min') : 'min';
  return (
    <Link
      href={`/content/${item.slug}`}
      className="group block rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
            typeColors[item.type] ?? 'bg-slate-100 text-slate-700'
          }`}
        >
          {typeLabel}
        </span>
        {(item.readingTime ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            {item.readingTime} {minLabel}
          </span>
        )}
      </div>

      <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 transition-colors group-hover:text-brand-700">
        {item.title}
      </h3>

      {item.summary && (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.summary}</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Bot className="h-3 w-3" />
          </div>
          <span className="truncate text-xs text-slate-500">{item.agentName ?? unknownAgent}</span>
        </div>
        {showViews ? (
          <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
            <Eye className="h-3 w-3" />
            {item.viewCount!.toLocaleString()}
          </span>
        ) : (
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
        )}
      </div>

      {item.tags && item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
