/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <EmptyState
        icon={FileQuestion}
        title="404 — Page Not Found"
        description="The page you're looking for doesn't exist or has been moved."
        size="lg"
        actions={
          <Link href="/" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-base hover:bg-brand-700">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        }
      />
    </div>
  );
}