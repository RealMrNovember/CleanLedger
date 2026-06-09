import type { SVGProps } from "react";

type ArtProps = SVGProps<SVGSVGElement>;

/** Kuru temizleme kataloğu — Lucide'de olmayan ürün siluetleri */
export function ArtPants({ className, ...props }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M8 3h8l1 5-1.5 13h-3L12 11l-1.5 10h-3L7 8l1-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 3h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArtSkirt({ className, ...props }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M9 3h6v4l4 14H5l4-14V3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArtDress({ className, ...props }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 3c1.2 0 2 .8 2 2v2l3 2-1 12H8L7 9l3-2V5c0-1.2.8-2 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArtJacket({ className, ...props }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M7 5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v2l2 3v11H5V10l2-3V5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 5v14M7 10h2M15 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArtCoat({ className, ...props }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M8 4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v1l3 2v13H5V7l3-2V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 3v15M8 9h2M14 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArtBlanket({ className, ...props }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect
        x="4"
        y="7"
        width="16"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M4 11h16M8 7v4M16 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArtCarpet({ className, ...props }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect
        x="3"
        y="8"
        width="18"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 6v2M9 5v3M12 4v4M15 5v3M18 6v2M6 18v-2M9 19v-3M12 20v-4M15 19v-3M18 18v-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M8 12h8M8 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArtBridal({ className, ...props }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 3 8 8h8l-4-5ZM7 8l1 12h8l1-12H7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="3" r="0.5" fill="currentColor" />
    </svg>
  );
}

export type ProductArtIcon = typeof ArtPants;
