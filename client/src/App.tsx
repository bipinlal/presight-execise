import { useEffect, useState } from 'react';
import { FilterSidebar } from './components/FilterSidebar';
import { SearchBar } from './components/SearchBar';
import { SortControls } from './components/SortControls';
import { UserList } from './components/UserList';
import { useDirectoryParams } from './hooks/useDirectoryParams';
import { useMediaQuery } from './hooks/useMediaQuery';

export function App() {
  const { state, update, toggle, clearFilters } = useDirectoryParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filterCount = state.nationalities.length + state.hobbies.length;

  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const sidebar = <FilterSidebar state={state} onToggle={toggle} onClear={clearFilters} />;

  return (
    <div className="flex h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <h1 className="shrink-0 text-lg font-bold">User Directory</h1>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBar
              value={state.search}
              onChange={(search) => update({ search }, { replace: true })}
            />
            <div className="flex items-center gap-2">
              <SortControls sortBy={state.sortBy} sortDir={state.sortDir} onChange={update} />
              {!isDesktop && (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
                >
                  Filters
                  {filterCount > 0 && (
                    <span className="rounded-full bg-indigo-600 px-1.5 text-xs text-white">
                      {filterCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 gap-6 px-4 pt-4">
        {isDesktop && (
          <aside className="w-72 shrink-0 overflow-y-auto pb-4" aria-label="Filters">
            {sidebar}
          </aside>
        )}
        <UserList state={state} onClearFilters={clearFilters} />
      </main>

      {!isDesktop && drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Done
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{sidebar}</div>
          </div>
        </div>
      )}
    </div>
  );
}
