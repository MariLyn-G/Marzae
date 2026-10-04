// Line illustrations: empty states, capacity diagram, scale preview.

const F = 'var(--font-body)';
const H = 'var(--font-heading)';

export function EmptyBagArt() {
  return (
    <svg width={130} height={112} viewBox="0 0 140 120" fill="none" aria-hidden="true">
      <path d="M30 44h80l-8 62H38L30 44Z" stroke="var(--color-text)" strokeWidth={1.4} />
      <path d="M52 44V30a18 18 0 0 1 36 0v14" stroke="var(--color-text)" strokeWidth={1.4} />
      <path d="M58 74h24" stroke="var(--color-accent)" strokeWidth={1.4} />
    </svg>
  );
}

export function FigureArt() {
  return (
    <svg width={148} height={148} viewBox="0 0 150 150" fill="none" aria-hidden="true">
      <circle cx={75} cy={34} r={15} stroke="var(--color-text)" strokeWidth={1.4} />
      <path d="M50 132V78a25 25 0 0 1 50 0v54" stroke="var(--color-text)" strokeWidth={1.4} />
      <path d="M50 84H36m64 0h14" stroke="var(--color-neutral-500)" strokeWidth={1.2} />
      <rect x={96} y={76} width={26} height={22} rx={3} stroke="var(--color-accent)" strokeWidth={1.4} />
      <path d="M24 142h102" stroke="var(--color-neutral-500)" strokeWidth={1} strokeDasharray="5 6" />
    </svg>
  );
}

export function CapacityArt() {
  const mut = 'var(--color-neutral-600)';
  const ink = 'var(--color-text)';
  const box = (x: number, y: number, w: number, h: number) => (
    <rect x={x} y={y} width={w} height={h} rx={3} fill="none" stroke={mut} strokeWidth={1} />
  );
  const lab = (x: number, y: number, s: string, anchor: 'start' | 'end' = 'start') => (
    <text x={x} y={y} fill={mut} fontSize={10.5} fontFamily={F} letterSpacing="0.12em" textAnchor={anchor}>{s}</text>
  );
  return (
    <svg viewBox="0 0 720 250" width="100%" style={{ display: 'block' }} role="img" aria-label="Aperture Tote capacity, drawn to scale with a 15-inch laptop, an A4 folder and a 500 ml bottle">
      <rect x={30} y={34} width={260} height={180} rx={4} fill="none" stroke="var(--color-accent)" strokeWidth={1.4} />
      <text x={30} y={24} fill="var(--color-accent)" fontSize={11} fontFamily={F} letterSpacing="0.14em">APERTURE TOTE — 14 L</text>
      {box(46, 62, 200, 130)}{lab(54, 182, '15-INCH LAPTOP')}
      {box(46, 62, 148, 130)}{lab(54, 80, 'A4 FOLDER')}
      {box(200, 124, 44, 88)}{lab(290, 232, 'BOTTLE, 500 ML', 'end')}
      <text x={336} y={62} fill={ink} fontSize={15} fontFamily={H}>Everything drawn to one scale.</text>
      <text x={336} y={92} fill={mut} fontSize={12.5} fontFamily={F}>A 15-inch laptop sits flat against the back panel;</text>
      <text x={336} y={114} fill={mut} fontSize={12.5} fontFamily={F}>an A4 folder shares the same slot without bowing;</text>
      <text x={336} y={136} fill={mut} fontSize={12.5} fontFamily={F}>a half-litre bottle stands upright in the gusset.</text>
      <line x1={336} y1={162} x2={690} y2={162} stroke="var(--color-divider)" strokeWidth={1} />
      <text x={336} y={188} fill={ink} fontSize={12.5} fontFamily={F}>Volumes are measured by water displacement,</text>
      <text x={336} y={208} fill={ink} fontSize={12.5} fontFamily={F}>with the flap closed and the bag standing.</text>
    </svg>
  );
}

export function ScaleArt() {
  const mut = 'var(--color-neutral-600)';
  return (
    <svg viewBox="0 0 800 600" width="100%" height="100%" style={{ display: 'block' }} preserveAspectRatio="none" aria-hidden="true">
      <line x1={0} y1={460} x2={800} y2={460} stroke="var(--color-text)" strokeWidth={1.2} />
      <rect x={60} y={372} width={190} height={88} rx={3} fill="none" stroke={mut} strokeWidth={1.2} />
      <text x={60} y={362} fill={mut} fontSize={12} fontFamily={F} letterSpacing="0.12em">16-INCH LAPTOP, OPEN</text>
      <path d="M664 400h58v42a18 18 0 0 1-18 18h-22a18 18 0 0 1-18-18v-42Zm58 10h14a12 12 0 0 1 0 24h-14" fill="none" stroke={mut} strokeWidth={1.2} />
      <text x={664} y={390} fill={mut} fontSize={12} fontFamily={F} letterSpacing="0.12em">CUP, 9 CM</text>
      <line x1={0} y1={120} x2={800} y2={120} stroke="var(--color-divider)" strokeWidth={1} strokeDasharray="5 7" />
      <text x={16} y={112} fill={mut} fontSize={11.5} fontFamily={F} letterSpacing="0.14em">EYE LEVEL, SEATED</text>
    </svg>
  );
}
