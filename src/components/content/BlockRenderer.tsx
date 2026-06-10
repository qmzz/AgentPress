/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import React from 'react';
import { TextBlock } from './TextBlock';
import { ImageBlock } from './ImageBlock';
import { CodeBlock } from './CodeBlock';
import { ChartBlock } from './ChartBlock';
import { AudioBlock } from './AudioBlock';
import { VideoBlock } from './VideoBlock';
import { EmbedBlock } from './EmbedBlock';
import type { ContentBlock } from '@/lib/db/schema';

interface BlockRendererProps {
  blocks: ContentBlock[];
}

const blockComponents: Record<string, React.FC<{ block: any }>> = {
  text: TextBlock,
  image: ImageBlock,
  code: CodeBlock,
  chart: ChartBlock,
  audio: AudioBlock,
  video: VideoBlock,
  embed: EmbedBlock,
};

export function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return <div className="text-center py-12 text-slate-400">No content blocks available.</div>;
  }

  return (
    <div className="space-y-8">
      {blocks.map((block, index) => {
        const Component = blockComponents[block.type];
        if (!Component) {
          return <div key={index} className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">[{block.type}] block type not supported</div>;
        }
        return <div key={index} className="content-block"><Component block={block} /></div>;
      })}
    </div>
  );
}
