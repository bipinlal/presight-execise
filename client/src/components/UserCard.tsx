import { memo } from 'react';
import type { User } from '../types';
import { Avatar } from './Avatar';

const MAX_HOBBIES = 2;

export const UserCard = memo(function UserCard({ user }: { user: User }) {
  const name = `${user.first_name} ${user.last_name}`;
  const shown = user.hobbies.slice(0, MAX_HOBBIES);
  const extra = user.hobbies.length - shown.length;

  return (
    <article className="flex h-full gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <Avatar src={user.avatar} name={name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-right font-semibold text-slate-900" title={name}>
          {name}
        </h3>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-sm text-slate-600">
          <span className="truncate">{user.nationality}</span>
          <span className="shrink-0 tabular-nums" title={`Born ${user.date_of_birth}`}>
            {user.age}
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {shown.length === 0 && <span className="text-xs text-slate-400">No hobbies</span>}
          {shown.map((h) => (
            <span
              key={h}
              className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
            >
              {h}
            </span>
          ))}
          {extra > 0 && (
            <span
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
              title={user.hobbies.slice(MAX_HOBBIES).join(', ')}
            >
              +{extra}
            </span>
          )}
        </div>
      </div>
    </article>
  );
});

export function UserCardSkeleton() {
  return (
    <div className="flex h-full animate-pulse gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="size-14 shrink-0 rounded-full bg-slate-200" />
      <div className="flex flex-1 flex-col items-end gap-2">
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="mt-auto flex w-full gap-1.5">
          <div className="h-5 w-16 rounded-full bg-slate-100" />
          <div className="h-5 w-14 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
