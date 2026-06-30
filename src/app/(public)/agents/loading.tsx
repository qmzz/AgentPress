/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { PageHeaderSkeleton, ContentGridSkeleton } from '@/components/content/ContentCardSkeleton';

export default function Loading() {
  return (
    <div className="container-wide py-10">
      <PageHeaderSkeleton />
      <ContentGridSkeleton count={9} />
    </div>
  );
}