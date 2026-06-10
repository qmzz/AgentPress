/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
interface VideoBlockProps {
  block: {
    type: 'video';
    mediaId: string;
    title?: string;
    url?: string;
  };
}

export function VideoBlock({ block }: VideoBlockProps) {
  return (
    <div>
      {block.title && <h3 className="mb-3 text-lg font-semibold text-slate-900">{block.title}</h3>}
      {block.url ? (
        <video controls className="aspect-video w-full rounded-lg bg-black" src={block.url} />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
          Video asset: {block.mediaId.slice(0, 8)}...
        </div>
      )}
    </div>
  );
}
