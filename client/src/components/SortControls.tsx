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
      <div className="relative">
        <select
          id="sort-by"
          value={sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value as SortField })}
          className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pr-10 pl-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          {SORT_FIELDS.map((f) => (
            <option key={f} value={f}>
              Sort: {LABELS[f]}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
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
