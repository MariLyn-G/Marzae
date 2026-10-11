import { describe, expect, it } from 'vitest';
import { advance, cancel, ordersCsv, restore } from '@/lib/orders';
import { SEED_ORDERS } from '@/server/seed-data';

const byId = (id: string) => structuredClone(SEED_ORDERS.find((o) => o.id === id)!);

describe('order transitions', () => {
  it('advances one stage and stamps history', () => {
    const o = advance(byId('MZ-4521'), '2026-10-11');
    expect(o.stage).toBe('cutting');
    expect(o.history.at(-1)).toEqual({ stage: 'cutting', at: '2026-10-11' });
  });

  it('leaves delivered and cancelled orders alone', () => {
    const delivered = byId('MZ-4380');
    const cancelled = byId('MZ-4455');
    expect(advance(delivered, 'x')).toBe(delivered);
    expect(advance(cancelled, 'x')).toBe(cancelled);
  });

  it('cancels only before shipping, and restore clears the flag', () => {
    const shipped = byId('MZ-4471');
    expect(cancel(shipped, 'x')).toBe(shipped);
    const c = cancel(byId('MZ-4512'), '2026-10-11');
    expect(c.cancelled).toBe(true);
    expect(restore(c, '2026-10-11').cancelled).toBe(false);
  });
});

describe('CSV export', () => {
  it('defuses spreadsheet formulas in customer text', () => {
    const o = byId('MZ-4521');
    o.customer.name = '=HYPERLINK("http://x","click")';
    const row = ordersCsv([o]).split('\n')[1];
    expect(row.startsWith('"MZ-4521","2026-10-03","\'=HYPERLINK(""http://x"",""click"")"')).toBe(true);
  });
});
