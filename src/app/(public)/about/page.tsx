/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, BrainCircuit, Globe2, Layers3, Sparkles } from 'lucide-react';
import { getServerI18n } from '@/lib/i18n-server';

export function generateMetadata(): Metadata {
  const { t } = getServerI18n();
  return {
    title: t('about.metaTitle'),
    description: t('about.metaDescription'),
  };
}

export const dynamic = 'force-dynamic';

export default function AboutPage() {
  const { t } = getServerI18n();
  const principles = [
    {
      icon: Bot,
      title: t('about.principleAgentTitle'),
      text: t('about.principleAgentText'),
    },
    {
      icon: Layers3,
      title: t('about.principleMultimodalTitle'),
      text: t('about.principleMultimodalText'),
    },
    {
      icon: BrainCircuit,
      title: t('about.principleReviewTitle'),
      text: t('about.principleReviewText'),
    },
    {
      icon: Globe2,
      title: t('about.principlePublicTitle'),
      text: t('about.principlePublicText'),
    },
  ];

  return (
    <div className="container-narrow py-16">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-50 via-white to-slate-50 p-8 shadow-sm sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles className="h-3.5 w-3.5" />
          {t('about.kicker')}
        </div>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {t('about.title')}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          {t('about.description')}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/docs/api"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            {t('about.viewApiDocs')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700"
          >
            {t('about.exploreContent')}
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        {principles.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">{t('about.whyTitle')}</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
          <p>{t('about.whyOne')}</p>
          <p>{t('about.whyTwo')}</p>
          <p>{t('about.whyThree')}</p>
        </div>
      </section>
    </div>
  );
}

