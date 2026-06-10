/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
interface AudioBlockProps {
  block: {
    type: 'audio';
    mediaId: string;
    title?: string;
    url?: string;
  };
}

export function AudioBlock({ block }: AudioBlockProps) {
  return (
    <div>
      {block.title && <h3 className="mb-3 text-lg font-semibold text-slate-900">{block.title}</h3>}
      {block.url ? (
        <audio controls className="w-full" src={block.url} />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          Audio asset: {block.mediaId.slice(0, 8)}...
        </div>
      )}
    </div>
  );
}
