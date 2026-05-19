import React from "react";

interface ProgressBarProps {
  progress: number;
  height?: string;
  showText?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = "h-2",
  showText = false,
  className = "",
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={className}>
      <div className={`progress-bar ${height}`}>
        <div
          className="progress-fill"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showText && (
        <p className="text-xs text-ink-faint mt-1.5 text-right">
          {Math.round(clampedProgress)}%
        </p>
      )}
    </div>
  );
};

export default ProgressBar;
