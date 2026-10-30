import { useState } from 'react';

export function Avatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (failed) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
        {initials}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      width={56}
      height={56}
      onError={() => setFailed(true)}
      className="size-14 shrink-0 rounded-full bg-slate-100 object-cover"
    />
  );
}
