import React from 'react';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: string;
  showText?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'bg-blue-500',
  height = 'h-2.5',
  showText = false,
  className = '',
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={className}>
      <div className={`progress-bar ${height}`}>
        <div
          className={`progress-fill ${color}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showText && (
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-400">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar; 