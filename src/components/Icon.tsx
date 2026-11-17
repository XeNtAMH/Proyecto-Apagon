import type { ReactNode } from 'react';

export type IconName =
  | 'bolt'
  | 'home'
  | 'calendar'
  | 'battery'
  | 'settings'
  | 'plus'
  | 'trash'
  | 'edit'
  | 'download'
  | 'upload'
  | 'check'
  | 'bell'
  | 'clock'
  | 'plug'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'phone'
  | 'tablet'
  | 'fan'
  | 'lamp'
  | 'wifi'
  | 'wifi-off'
  | 'pin'
  | 'arrow-right';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

const ICONS: Record<IconName, ReactNode> = {
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" stroke="none" />,
  home: (
    <>
      <path d="M3 10.8 12 3l9 7.8" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 10v4M6 10v4M10 10v4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="var(--surface)" />
      <circle cx="15" cy="12" r="2" fill="var(--surface)" />
      <circle cx="8" cy="17" r="2" fill="var(--surface)" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M5 21h14" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  plug: (
    <>
      <path d="M12 3v9" />
      <path d="M6.5 8a8 8 0 1 0 11 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  tablet: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  fan: (
    <>
      <circle cx="12" cy="12" r="1.7" />
      <path d="M12 10.3C12 6.8 12.8 4.5 14.6 4.5c1.7 0 2.6 1.7 1.7 3.4-.9 1.7-2.6 2.1-4.3 2.4M13.7 12c3.5 0 5.8.8 5.8 2.6 0 1.7-1.7 2.6-3.4 1.7-1.7-.9-2.1-2.6-2.4-4.3M12 13.7c0 3.5-.8 5.8-2.6 5.8-1.7 0-2.6-1.7-1.7-3.4.9-1.7 2.6-2.1 4.3-2.4M10.3 12C6.8 12 4.5 11.2 4.5 9.4c0-1.7 1.7-2.6 3.4-1.7 1.7.9 2.1 2.6 2.4 4.3" />
    </>
  ),
  lamp: (
    <>
      <path d="M9 3h6l3 8H6l3-8Z" />
      <path d="M12 11v7M8.5 21h7" />
    </>
  ),
  wifi: (
    <>
      <path d="M4.5 11.5a11 11 0 0 1 15 0M8 15a6 6 0 0 1 8 0M12 18.5h.01" />
    </>
  ),
  'wifi-off': (
    <>
      <path d="m3 3 18 18" />
      <path d="M8.5 8.5A10.5 10.5 0 0 1 21 9M3 9a15 15 0 0 1 3.4-.8M6 13a10 10 0 0 1 3-1.4M9.5 16.5a4 4 0 0 1 5 0M12 20h.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function Icon({ name, size = 24, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
