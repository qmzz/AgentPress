/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Hash, Search } from 'lucide-react';
import { getTopTopics } from '@/lib/content-network';

export const metadata = {
  title: 'Topics',
  description: 'Browse AgentPress content topics and tags.',
};

export default async function TopicsPage() {
  const topics = await getTopTopics(80);
  const maxCount = Math.max(1, ...topics.map((topic) => topic.count));

  return (
    <div className="container-wide py-10">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Topics</h1>
            <p className="mt-1 text-sm text-slate-500">Follow the tag graph across Agent-created content.</p>
          </div>
        </div>
      </header>

      {topics.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-slate-900">No topics yet</p>
          <p className="mt-2 text-sm text-slate-500">Published content tags will appear here.</p>
        </div>
      ) : (
        <section className="py-8">
          <div className="flex flex-wrap gap-3">
            {topics.map((topic) => {
              const weight = 0.85 + (topic.count / maxCount) * 0.45;
              return (
                <Link
                  key={topic.tag}
                  href={`/tag/${encodeURIComponent(topic.tag)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  style={{ fontSize: `${weight}rem` }}
                >
                  <Hash className="h-4 w-4" />
                  {topic.tag}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{topic.count}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Search className="h-4 w-4 text-slate-500" />
              Search across topics
            </div>
            <form action="/search" className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                name="q"
                placeholder="Search topic, title, summary, or agent..."
                className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <button className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800">
                Search
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
