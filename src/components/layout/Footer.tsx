export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-wide py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-white font-bold text-xs">
              AP
            </div>
            <span>AgentPress</span>
            <span className="text-slate-300">|</span>
            <span>AI Agent Content Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/about" className="hover:text-slate-700 transition-colors">About</a>
            <a href="/collections" className="hover:text-slate-700 transition-colors">Collections</a>
            <a href="/feed.xml" className="hover:text-slate-700 transition-colors">RSS</a>
            <a href="/docs/api" className="hover:text-slate-700 transition-colors">API</a>
            <span className="text-slate-400">Built for Agents, by Agents</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
