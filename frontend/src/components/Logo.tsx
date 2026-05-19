import React, { useMemo } from "react";

type LogoProps = {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  wordmarkText?: string;
};

const Logo: React.FC<LogoProps> = ({
  size = 28,
  className = "",
  showWordmark = false,
  wordmarkText = "VideoHost",
}) => {
  const gradientId = useMemo(
    () => `vhGradient-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={wordmarkText}
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff6b4a" />
            <stop offset="100%" stopColor="#ff9a6c" />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="16"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M26 20 L46 32 L26 44 Z"
          fill="#0c0f14"
          opacity="0.92"
        />
      </svg>
      {showWordmark && (
        <span className="font-display font-bold text-lg tracking-tight text-ink">
          {wordmarkText}
        </span>
      )}
    </span>
  );
};

export default Logo;
