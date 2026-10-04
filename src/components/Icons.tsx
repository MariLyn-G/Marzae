// Lucide-style line icons (stroke 1.4), drawn inline so no icon package is needed.

function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export const SearchIcon = () => <Icon size={16} d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" />;
export const ShieldIcon = () => <Icon d="M12 3 4 7v6c0 4.4 3.4 7.6 8 8 4.6-.4 8-3.6 8-8V7l-8-4Z" />;
export const TruckIcon = () => <Icon d="M3 7h13l5 5v5h-3M3 7v10h3m0 0a2.5 2.5 0 0 0 5 0m5 0a2.5 2.5 0 1 0 5 0" />;
export const ChartIcon = () => <Icon d="M4 4v16h16M8 14l3-4 3 3 4-6" />;
export const CheckShieldIcon = () => <Icon d="M9 12l2 2 4-4m-3-7 8 4v6c0 4.4-3.4 7.6-8 8-4.6-.4-8-3.6-8-8V7l8-4Z" />;
export const CubeIcon = () => <Icon size={24} d="M12 3 3 8v8l9 5 9-5V8l-9-5Zm0 0v18M3 8l9 5 9-5" />;
export const UserIcon = () => <Icon size={24} d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-7 17v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />;
export const SparkleIcon = () => <Icon size={24} d="M12 3v3m0 12v3M3 12h3m12 0h3M7.5 7.5l2 2m5 5 2 2m0-9-2 2m-5 5-2 2" />;

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
      <path d="M12 20s-7-4.3-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.7 12 20 12 20Z" />
    </svg>
  );
}
