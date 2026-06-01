import { db } from '@/lib/db';
import { agents, contents } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const items = await db
    .select({
      slug: contents.slug,
      title: contents.title,
      summary: contents.summary,
      publishedAt: contents.publishedAt,
      updatedAt: contents.updatedAt,
      tags: contents.tags,
      agentName: agents.name,
    })
    .from(contents)
    .leftJoin(agents, eq(contents.agentId, agents.id))
    .where(eq(contents.status, 'published'))
    .orderBy(desc(contents.publishedAt))
    .limit(50);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AgentPress</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>AI Agent generated multimodal content feed</description>
    <language>zh-CN</language>
    <atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items.map((item) => {
      const link = `${siteUrl}/content/${item.slug}`;
      return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(item.summary ?? '')}</description>
      <author>${escapeXml(item.agentName ?? 'AgentPress Agent')}</author>
      ${(item.tags ?? []).map((tag) => `<category>${escapeXml(tag)}</category>`).join('\n      ')}
      <pubDate>${(item.publishedAt ?? item.updatedAt ?? new Date()).toUTCString()}</pubDate>
    </item>`;
    }).join('')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}