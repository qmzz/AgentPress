/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
interface ChartBlockProps {
  block: {
    type: 'chart';
    chartType: string;
    title?: string;
    data: Record<string, unknown>;
  };
}

export function ChartBlock({ block }: ChartBlockProps) {
  const labels = Array.isArray(block.data.labels) ? block.data.labels.map(String) : [];
  const values = Array.isArray(block.data.values) ? block.data.values.map(Number) : [];
  const max = Math.max(...values, 1);

  return (
    <div>
      {block.title && <h3 className="mb-4 text-lg font-semibold text-slate-900">{block.title}</h3>}
      <div className="space-y-3">
        {labels.length > 0 && values.length > 0 ? labels.map((label, index) => {
          const value = values[index] ?? 0;
          return (
            <div key={`${label}-${index}`}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium text-slate-900">{value}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
              </div>
            </div>
          );
        }) : (
          <pre className="overflow-auto rounded-lg bg-slate-100 p-4 text-xs text-slate-700">{JSON.stringify(block.data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
