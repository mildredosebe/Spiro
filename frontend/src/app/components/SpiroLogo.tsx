import { Bike } from "lucide-react";

type SpiroLogoSize = "xs" | "sm" | "md" | "lg";

interface SpiroLogoProps {
  size?: SpiroLogoSize;
  showTagline?: boolean;
  className?: string;
}

const sizeConfig: Record<
  SpiroLogoSize,
  { wordmark: number; swooshWidth: number; swooshHeight: number; tagline: number; cartBubble: number; cartIcon: number }
> = {
  xs: { wordmark: 34, swooshWidth: 108, swooshHeight: 18, tagline: 10, cartBubble: 18, cartIcon: 10 },
  sm: { wordmark: 44, swooshWidth: 138, swooshHeight: 20, tagline: 11, cartBubble: 22, cartIcon: 12 },
  md: { wordmark: 58, swooshWidth: 176, swooshHeight: 24, tagline: 13, cartBubble: 26, cartIcon: 14 },
  lg: { wordmark: 76, swooshWidth: 232, swooshHeight: 30, tagline: 16, cartBubble: 30, cartIcon: 16 },
};

export function SpiroLogo({ size = "sm", showTagline = false, className = "" }: SpiroLogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={`inline-flex flex-col items-start ${className}`} aria-label="Spiro logo">
      <div className="relative inline-flex items-end gap-2">
        <div className="relative inline-block">
          <span
            className="relative z-10 block select-none lowercase text-[#0b2e59]"
            style={{
              fontSize: `${config.wordmark}px`,
              lineHeight: 0.82,
              fontWeight: 800,
              fontFamily: "'Sora', 'Manrope', 'Segoe UI', sans-serif",
              letterSpacing: "-0.05em",
              textTransform: "lowercase",
              fontStyle: "italic",
            }}
          >
            spiro
          </span>

          <svg
            className="pointer-events-none absolute left-[4%] z-0"
            style={{ bottom: `-${Math.max(6, Math.round(config.swooshHeight * 0.42))}px` }}
            width={config.swooshWidth}
            height={config.swooshHeight}
            viewBox="0 0 260 40"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M 8 30 C 72 2, 164 2, 250 20"
              stroke="#0b2e59"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div
          className="grid place-items-center rounded-full bg-[#0b2e59] text-[#f4c430] shadow-lg shadow-[#0b2e59]/20"
          style={{ width: `${config.cartBubble}px`, height: `${config.cartBubble}px` }}
          aria-hidden="true"
        >
          <Bike style={{ width: `${config.cartIcon}px`, height: `${config.cartIcon}px` }} />
        </div>
      </div>

      {showTagline ? (
        <p
          className="mt-4 pl-2 font-semibold tracking-[0.02em] text-[#0b2e59]"
          style={{ fontSize: `${config.tagline}px`, fontFamily: "'Manrope', 'Segoe UI', sans-serif" }}
        >
          Powering Every Ride
        </p>
      ) : null}
    </div>
  );
}
