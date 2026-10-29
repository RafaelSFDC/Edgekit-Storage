import React, { useId, type SVGProps } from 'react';

export type EdgekitModuleId = 'platform' | 'auth' | 'storage' | 'queue' | 'events';

export const EDGEKIT_MODULE_HEX: Record<EdgekitModuleId, string> = {
  platform: '#F38020', // Orange (Cloudflare / Hub)
  auth: '#6366F1',     // Indigo (Auth / Sessions)
  storage: '#0284C7',  // Sky/Blue (Buckets / R2)
  queue: '#EC4899',    // Pink (Jobs / Messages)
  events: '#0EA5E9',   // Sky Blue (Realtime / WebSockets)
};

export const EDGEKIT_MODULE_COLORS: Record<EdgekitModuleId, string> = {
  platform: 'var(--primary, #0284C7)',
  auth: 'var(--primary, #0284C7)',
  storage: 'var(--primary, #0284C7)',
  queue: 'var(--primary, #0284C7)',
  events: 'var(--primary, #0284C7)',
};

export interface EdgekitLogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
  variant?: 'app-icon' | 'symbol' | 'glow';
  module?: EdgekitModuleId;
}

export function EdgekitLogo({
  size = 24,
  variant = 'app-icon',
  module = 'storage',
  className = '',
  fill,
  ...props
}: EdgekitLogoProps) {
  const gradientId = useId();

  const brandColor =
    fill ??
    (module && EDGEKIT_MODULE_COLORS[module]
      ? EDGEKIT_MODULE_COLORS[module]
      : 'var(--primary, #0284C7)');

  const coreFill = variant === 'symbol' ? (fill ?? 'currentColor') : brandColor;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient
          id={`edge-grad-${gradientId}`}
          x1="5"
          y1="3"
          x2="35"
          y2="37"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={coreFill} stopOpacity="0.8" />
          <stop offset="1" stopColor={coreFill} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Hexagonal Edge Network Node */}
      <path
        d="M20 3.5L34.5 11.87V28.13L20 36.5L5.5 28.13V11.87L20 3.5Z"
        stroke={`url(#edge-grad-${gradientId})`}
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill={coreFill}
        fillOpacity="0.08"
      />

      {/* Micro-nodes at vertices */}
      <circle cx="20" cy="3.5" r="1.5" fill={coreFill} />
      <circle cx="34.5" cy="11.87" r="1.5" fill={coreFill} />
      <circle cx="34.5" cy="28.13" r="1.5" fill={coreFill} />
      <circle cx="20" cy="36.5" r="1.5" fill={coreFill} />
      <circle cx="5.5" cy="28.13" r="1.5" fill={coreFill} />
      <circle cx="5.5" cy="11.87" r="1.5" fill={coreFill} />

      {/* Storage Disk/Core */}
      <path
        d="M21.5 8L11 21H19.5L17.5 32L29 19H20.5L22.5 8Z"
        fill={coreFill}
      />
    </svg>
  );
}
