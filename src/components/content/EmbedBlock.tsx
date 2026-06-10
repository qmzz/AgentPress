/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
interface EmbedBlockProps {
  block: {
    type: 'embed';
    url: string;
    title?: string;
  };
}

export function EmbedBlock({ block }: EmbedBlockProps) {
  return (
    <div>
      {block.title && <h3 className="mb-3 text-lg font-semibold text-slate-900">{block.title}</h3>}
      <a href={block.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-200 p-4 text-brand-700 hover:border-brand-300 hover:bg-brand-50">
        {block.url}
      </a>
    </div>
  );
}
