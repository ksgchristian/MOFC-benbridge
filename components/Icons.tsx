/** Small line icons (24×24, currentColor), so the UI doesn't depend on emoji. */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const MicIcon = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </Svg>
);

export const StopIcon = (p: P) => (
  <Svg {...p}>
    <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />
  </Svg>
);

export const SendIcon = (p: P) => (
  <Svg {...p} strokeWidth={2.5}>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </Svg>
);

export const RedoIcon = (p: P) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.35-5.65L20 8.5" />
    <path d="M20 4v4.5h-4.5" />
  </Svg>
);

export const SpeakerIcon = (p: P) => (
  <Svg {...p}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </Svg>
);

export const FlagIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h12l-2.5 4L17 12H5" fill={filled ? "currentColor" : "none"} />
  </Svg>
);

export const CheckIcon = (p: P) => (
  <Svg {...p} strokeWidth={2.5}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const XIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const SparkleIcon = (p: P) => (
  <Svg {...p} strokeWidth={1.8}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </Svg>
);

export const AlertIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 4 2.5 20h19z" />
    <path d="M12 10v4" />
    <path d="M12 17.5v.01" />
  </Svg>
);

export const MicOffIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V6a3 3 0 0 0-5.7-1.3" />
    <path d="M5 11a7 7 0 0 0 11.5 5.4M19 11a7 7 0 0 1-.6 2.8" />
    <path d="M12 18v3M3 3l18 18" />
  </Svg>
);
