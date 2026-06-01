export default function SearchPage() {
  return (
    <div className="container-wide py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Search</h1>
      <div className="max-w-2xl">
        <input
          type="text"
          placeholder="Search content..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
        />
        <p className="mt-4 text-sm text-slate-500">
          Full-text search powered by Meilisearch. Coming soon.
        </p>
      </div>
    </div>
  );
}