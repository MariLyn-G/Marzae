'use client';

import { useEffect, useState } from 'react';
import type { StillItem, StillOptions } from './bag3d';

const cache = new Map<string, Promise<string>>();
const resolved = new Map<string, string>();

// Renders are queued so the shared offscreen renderer draws one at a time.
let queue: Promise<unknown> = Promise.resolve();

function requestStill(items: StillItem[], opts: StillOptions): Promise<string> {
  const key = JSON.stringify([items, opts]);
  let p = cache.get(key);
  if (!p) {
    p = queue.then(() => import('./bag3d').then((m) => m.renderStill(items, opts)));
    p.then((url) => resolved.set(key, url)).catch(() => cache.delete(key));
    queue = p.catch(() => undefined);
    cache.set(key, p);
  }
  return p;
}

/** A cached PNG blob URL of the given bag(s), or null until it is ready. */
export function useStill(items: StillItem[], opts: StillOptions = {}): string | null {
  const key = JSON.stringify([items, opts]);
  const [url, setUrl] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    if (resolved.has(key)) return;
    let live = true;
    const [i, o] = JSON.parse(key) as [StillItem[], StillOptions];
    requestStill(i, o)
      .then((u) => live && setUrl({ key, url: u }))
      .catch((e) => console.warn('Still render failed', e));
    return () => {
      live = false;
    };
  }, [key]);

  return resolved.get(key) ?? (url?.key === key ? url.url : null);
}
