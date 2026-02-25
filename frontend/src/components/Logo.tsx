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
  wordmarkText = "VideoTube",
}) => {
  const gradientId = useMemo(
    () => `vhGradient-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  return (
    <span className={`inline-flex items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={wordmarkText}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feOffset dy="1" result="offsetBlur" />
            <feMerge>
              <feMergeNode in="offsetBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Colorful orb */}
        <circle
          cx="32"
          cy="32"
          r="24"
          fill={`url(#${gradientId})`}
          filter="url(#softShadow)"
        />

        {/* Play triangle */}
        <path d="M27 22 L44 32 L27 42 Z" fill="#FFFFFF" opacity="0.95" />

        {/* Sparkle */}
        <g transform="translate(46 14) rotate(15)">
          <rect
            x="-1.5"
            y="-5"
            width="3"
            height="10"
            rx="1.5"
            fill="#FFFFFF"
            opacity="0.9"
          />
          <rect
            x="-5"
            y="-1.5"
            width="10"
            height="3"
            rx="1.5"
            fill="#FFFFFF"
            opacity="0.9"
          />
        </g>
      </svg>
      {showWordmark && (
        <span className="ml-2 font-bold tracking-tight text-gray-100">
          {wordmarkText}
        </span>
      )}
    </span>
  );
};

export default Logo;
