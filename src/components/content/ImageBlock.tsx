import React from 'react';

interface ImageBlockProps {
  block: {
    type: 'image';
    mediaId: string;
    caption?: string;
    alt?: string;
    url?: string;
  };
}

export function ImageBlock({ block }: ImageBlockProps) {
  return (
    <figure>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
        {block.url ? (
          <img
            src={block.url}
            alt={block.alt ?? block.caption ?? 'Content image'}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <span className="text-sm">Image: {block.mediaId.slice(0, 8)}...</span>
          </div>
        )}
      </div>
      {block.caption && (
        <figcaption className="mt-3 text-center text-sm text-slate-500">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
