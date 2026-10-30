import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const lastCommitted = useRef(value);
  const commit = useDebouncedCallback((v: string) => {
    lastCommitted.current = v.trim();
    onChange(v.trim());
  }, 300);

  // Follow external URL changes (back/forward, "clear all").
  useEffect(() => {
    if (value !== lastCommitted.current) {
      commit.cancel();
      lastCommitted.current = value;
      setText(value);
    }
  }, [value, commit]);

  return (
    <div className="relative w-full">
      <svg
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
          clipRule="evenodd"
        />
      </svg>
      <input
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        placeholder="Search by first or last name…"
        aria-label="Search by first or last name"
        maxLength={100}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-9 pl-9 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText('');
            commit.cancel();
            lastCommitted.current = '';
            onChange('');
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
        >
          ✕
        </button>
      )}
    </div>
  );
}
