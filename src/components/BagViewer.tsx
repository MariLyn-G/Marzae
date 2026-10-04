'use client';

import { useEffect, useRef } from 'react';
import type { BagColors, Spec3D } from '@/lib/catalog';
import type { Viewer, ViewName } from '@/lib/bag3d';

interface Props {
  spec: Spec3D;
  colors: BagColors;
  view?: ViewName;
  zoom?: number;
  autorotate?: boolean;
  shadow?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

/**
 * Interactive WebGL bag. The canvas is created inside the effect so each mount
 * gets a fresh WebGL context (React strict mode mounts twice in development).
 * Only one of these should be on screen at a time.
 */
export function BagViewer({ spec, colors, view, zoom = 1, autorotate = true, shadow = true, className, style, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const latest = useRef({ spec, colors, view, zoom, autorotate });
  useEffect(() => {
    latest.current = { spec, colors, view, zoom, autorotate };
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none';
    if (label) canvas.setAttribute('aria-label', label);
    canvas.setAttribute('role', 'img');
    el.appendChild(canvas);
    import('@/lib/bag3d')
      .then(({ createViewer }) => {
        if (cancelled) return;
        const v = createViewer(canvas, { autorotate: latest.current.autorotate, shadow });
        const s = latest.current;
        v.setConfig(s.spec, s.colors);
        if (s.view) v.setView(s.view);
        v.setZoom(s.zoom);
        viewer.current = v;
      })
      .catch((e) => console.warn('3D viewer unavailable', e));
    return () => {
      cancelled = true;
      viewer.current?.dispose();
      viewer.current = null;
      canvas.remove();
    };
  }, [shadow, label]);

  const configKey = JSON.stringify([spec, colors]);
  useEffect(() => {
    const [s, c] = JSON.parse(configKey) as [Spec3D, BagColors];
    viewer.current?.setConfig(s, c);
  }, [configKey]);

  useEffect(() => {
    if (view) viewer.current?.setView(view);
  }, [view]);

  useEffect(() => {
    viewer.current?.setZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    viewer.current?.setAutorotate(autorotate);
  }, [autorotate]);

  return <div ref={host} className={className} style={{ position: 'absolute', inset: 0, ...style }} />;
}
