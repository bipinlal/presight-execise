import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUsers } from '../api/queries';
import type { DirectoryState } from '../types';
import { EmptyState, ErrorState, Spinner } from './States';
import { UserCard, UserCardSkeleton } from './UserCard';

const ROW_HEIGHT = 136; // card height + vertical gap
const GAP = 12;
const TWO_LANE_MIN_WIDTH = 760;

export function UserList({
  state,
  onClearFilters,
}: {
  state: DirectoryState;
  onClearFilters: () => void;
}) {
  const query = useUsers(state);
  const { data, error, isPending, isError, isPlaceholderData, hasNextPage, isFetchingNextPage } =
    query;
  const users = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const lanes = useLanes(scrollRef);

  // Footer row: loading indicator, next-page error, or end-of-list marker.
  const showFooter = users.length > 0;
  const count = users.length + (showFooter ? lanes : 0);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
    lanes,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems.at(-1)?.index ?? -1;

  useEffect(() => {
    if (
      lastIndex >= users.length - lanes * 4 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !query.isFetchNextPageError
    ) {
      void query.fetchNextPage();
    }
  }, [lastIndex, users.length, lanes, hasNextPage, isFetchingNextPage, query]);

  // Jump back to the top whenever the result set changes.
  const stateKey = JSON.stringify(state);
  const settledKey = isPlaceholderData ? null : stateKey;
  useLayoutEffect(() => {
    if (settledKey) scrollRef.current?.scrollTo({ top: 0 });
  }, [settledKey]);

  let content;
  if (isPending) {
    content = (
      <div
        className="grid gap-3 p-1"
        style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{ height: ROW_HEIGHT - GAP }}>
            <UserCardSkeleton />
          </div>
        ))}
      </div>
    );
  } else if (isError && users.length === 0) {
    content = (
      <ErrorState
        title="Couldn't load users"
        message={error.message}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (users.length === 0) {
    content = (
      <EmptyState>
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Clear all filters
        </button>
      </EmptyState>
    );
  } else {
    content = (
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((item) => {
          const isFooter = item.index >= users.length;
          if (isFooter && item.lane !== 0) return null;
          return (
            <div
              key={item.key}
              className="absolute top-0 px-1"
              style={{
                transform: `translateY(${item.start}px)`,
                height: ROW_HEIGHT - GAP,
                left: isFooter ? 0 : `${(item.lane / lanes) * 100}%`,
                width: isFooter ? '100%' : `${100 / lanes}%`,
              }}
            >
              {isFooter ? (
                <ListFooter
                  loading={isFetchingNextPage || !!hasNextPage}
                  error={query.isFetchNextPageError ? error?.message : undefined}
                  onRetry={() => void query.fetchNextPage()}
                  total={total}
                />
              ) : (
                <UserCard user={users[item.index]} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-busy={query.isFetching}>
      <div className="flex h-6 items-center gap-2 px-1 text-sm text-slate-600" aria-live="polite">
        {!isPending && !isError && (
          <span>
            <strong className="text-slate-900">{total.toLocaleString()}</strong>{' '}
            {total === 1 ? 'user' : 'users'}
          </span>
        )}
        {(isPlaceholderData || (query.isFetching && !isFetchingNextPage && !isPending)) && (
          <Spinner className="size-4" />
        )}
      </div>
      <div
        ref={scrollRef}
        className={`mt-2 min-h-0 flex-1 overflow-y-auto pb-4 transition-opacity [overflow-anchor:none] ${
          isPlaceholderData ? 'opacity-60' : ''
        }`}
      >
        {content}
      </div>
    </section>
  );
}

function ListFooter({
  loading,
  error,
  onRetry,
  total,
}: {
  loading: boolean;
  error?: string;
  onRetry: () => void;
  total: number;
}) {
  if (error)
    return (
      <ErrorState compact title="Couldn't load more users" message={error} onRetry={onRetry} />
    );
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
      {loading ? (
        <>
          <Spinner /> Loading more…
        </>
      ) : (
        <>You've reached the end · {total.toLocaleString()} users</>
      )}
    </div>
  );
}

function useLanes(ref: React.RefObject<HTMLElement | null>) {
  const [lanes, setLanes] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setLanes(el.clientWidth >= TWO_LANE_MIN_WIDTH ? 2 : 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return lanes;
}
