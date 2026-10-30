import { SORT_FIELDS, type SortDir, type SortField } from '../types';

const LABELS: Record<SortField, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  age: 'Age',
  nationality: 'Nationality',
};

export function SortControls({
  sortBy,
  sortDir,
  onChange,
}: {
  sortBy: SortField;
  sortDir: SortDir;
  onChange: (patch: { sortBy?: SortField; sortDir?: SortDir }) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <label htmlFor="sort-by" className="sr-only">
        Sort by
      </label>
      <select
        id="sort-by"
        value={sortBy}
        onChange={(e) => onChange({ sortBy: e.target.value as SortField })}
        className="rounded-lg border border-slate-300 bg-white py-2 pr-8 pl-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
      >
        {SORT_FIELDS.map((f) => (
          <option key={f} value={f}>
            Sort: {LABELS[f]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' })}
        aria-label={`Sort direction: ${sortDir === 'asc' ? 'ascending' : 'descending'}. Click to toggle.`}
        title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
        className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        <span aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>
        <span>{sortDir === 'asc' ? 'Asc' : 'Desc'}</span>
      </button>
    </div>
  );
}
