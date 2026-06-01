import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-slate-900">404</h1>
      <p className="mt-4 text-lg text-slate-600">Page not found</p>
      <Link href="/" className="mt-8 rounded-lg bg-brand-600 px-6 py-3 text-white hover:bg-brand-700 transition-colors">
        Back to Home
      </Link>
    </div>
  );
}