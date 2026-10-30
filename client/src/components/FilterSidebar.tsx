import { useFacets } from '../api/queries';
import type { DirectoryState, FacetValue } from '../types';
import { ErrorState, Spinner } from './States';

type FacetKey = 'nationalities' | 'hobbies';

export function FilterSidebar({
  state,
  onToggle,
  onClear,
}: {
  state: DirectoryState;
  onToggle: (key: FacetKey, value: string) => void;
  onClear: () => void;
}) {
  const facets = useFacets(state);
  const activeCount = state.nationalities.length + state.hobbies.length + (state.search ? 1 : 0);

  return (
    <div className="flex flex-col gap-5">
      <ActiveFilters state={state} onToggle={onToggle} onClear={onClear} count={activeCount} />

      {facets.isPending ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="size-4" /> Loading filters…
        </div>
      ) : facets.isError && !facets.data ? (
        <ErrorState
          compact
          title="Couldn't load filters"
          message={facets.error.message}
          onRetry={() => void facets.refetch()}
        />
      ) : (
        <div
          className={`flex flex-col gap-5 transition-opacity ${facets.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          <FacetSection
            title="Hobbies"
            hint="Users must have all selected hobbies"
            values={facets.data.hobbies}
            selected={state.hobbies}
            onToggle={(v) => onToggle('hobbies', v)}
          />
          <FacetSection
            title="Nationalities"
            hint="Users may match any selected nationality"
            values={facets.data.nationalities}
            selected={state.nationalities}
            onToggle={(v) => onToggle('nationalities', v)}
          />
        </div>
      )}
    </div>
  );
}

function ActiveFilters({
  state,
  onToggle,
  onClear,
  count,
}: {
  state: DirectoryState;
  onToggle: (key: FacetKey, value: string) => void;
  onClear: () => void;
  count: number;
}) {
  if (count === 0) return null;
  const chips = [
    ...state.hobbies.map((v) => ({ key: 'hobbies' as const, value: v })),
    ...state.nationalities.map((v) => ({ key: 'nationalities' as const, value: v })),
  ];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Active filters
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Clear all
        </button>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {state.search && (
          <li className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
            “{state.search}”
          </li>
        )}
        {chips.map(({ key, value }) => (
          <li key={`${key}:${value}`}>
            <button
              type="button"
              onClick={() => onToggle(key, value)}
              aria-label={`Remove ${value} filter`}
              className="flex items-center gap-1 rounded-full bg-indigo-600 py-1 pr-2 pl-2.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              {value} <span aria-hidden>✕</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FacetSection({
  title,
  hint,
  values,
  selected,
  onToggle,
}: {
  title: string;
  hint: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Top {title}
      </legend>
      <p className="mt-0.5 mb-2 text-xs text-slate-400">{hint}</p>
      {values.length === 0 ? (
        <p className="text-sm text-slate-500">No values for the current results.</p>
      ) : (
        <ul className="flex flex-col">
          {values.map(({ value, count }) => {
            const checked = selected.includes(value);
            return (
              <li key={value}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(value)}
                    className="size-4 rounded border-slate-300 accent-indigo-600"
                  />
                  <span
                    className={`flex-1 truncate ${checked ? 'font-medium text-slate-900' : 'text-slate-700'}`}
                  >
                    {value}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 tabular-nums">
                    {count.toLocaleString()}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
