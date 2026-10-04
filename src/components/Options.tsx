'use client';

import { HARDWARE, LEATHERS, STRAPS, type HardwareId, type LeatherId, type StrapId } from '@/lib/catalog';

export function HideSwatches({ value, onChange, size }: { value: LeatherId | null; onChange: (id: LeatherId) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Hide" style={size === 'sm' ? { gap: 8 } : size === 'md' ? { gap: 10 } : undefined}>
      {LEATHERS.map((l) => (
        <button
          key={l.id}
          role="radio"
          aria-checked={value === l.id}
          title={l.name}
          aria-label={l.name}
          className={['swatch', size, value === l.id ? 'on' : ''].filter(Boolean).join(' ')}
          style={{ background: l.hex }}
          onClick={() => onChange(l.id)}
        />
      ))}
    </div>
  );
}

export function HardwareChips({ value, onChange }: { value: HardwareId; onChange: (id: HardwareId) => void }) {
  return (
    <div className="chips" role="radiogroup" aria-label="Hardware">
      {HARDWARE.map((h) => (
        <button key={h.id} role="radio" aria-checked={value === h.id} className={value === h.id ? 'chip on' : 'chip'} onClick={() => onChange(h.id)}>
          <span className="metal" style={{ background: h.hex }} />
          {h.name}
        </button>
      ))}
    </div>
  );
}

export function StrapChips({ value, onChange }: { value: StrapId; onChange: (id: StrapId) => void }) {
  return (
    <div className="chips" role="radiogroup" aria-label="Strap">
      {STRAPS.map((s) => (
        <button key={s.id} role="radio" aria-checked={value === s.id} className={value === s.id ? 'chip on' : 'chip'} onClick={() => onChange(s.id)}>
          {s.name}
          {s.surchargeEur ? ` (+€${s.surchargeEur})` : ''}
        </button>
      ))}
    </div>
  );
}
