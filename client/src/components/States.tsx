import type { ReactNode } from 'react';

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-indigo-600 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  compact,
}: {
  title?: string;
  message: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center text-center ${compact ? 'gap-2 p-4' : 'gap-3 p-10'}`}
    >
      {!compact && <div className="text-4xl">⚠️</div>}
      <p className="font-medium text-slate-900">{title}</p>
      <p className="text-sm text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Retry
      </button>
    </div>
  );
}

export function EmptyState({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <div className="text-4xl">🔍</div>
      <p className="font-medium text-slate-900">No users match your filters</p>
      <p className="text-sm text-slate-600">Try a different search or remove some filters.</p>
      {children}
    </div>
  );
}
