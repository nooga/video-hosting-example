import React, { useState } from "react";
import { PlayIcon, ClockIcon } from "@heroicons/react/24/solid";
import { Video } from "../types/video";
import { VideoAPI } from "../services/api";
import { displayUploaderName } from "../utils/displayName";

interface VideoCardProps {
  video: Video;
  onClick?: (video: Video) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  const [imageError, setImageError] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "ready":
        return "badge-ready";
      case "processing":
        return "badge-processing";
      case "failed":
        return "badge-failed";
      default:
        return "badge-default";
    }
  };

  const getThumbnailUrl = (): string => {
    if (video.thumbnails && video.thumbnails.length > 0) {
      return VideoAPI.getThumbnailUrl(video.thumbnails[0]);
    }
    return "";
  };

  return (
    <article
      className="video-card group"
      onClick={() => onClick?.(video)}
    >
      <div
        className="relative w-full bg-surface-overlay overflow-hidden"
        style={{ aspectRatio: "16/9" }}
      >
        {getThumbnailUrl() && !imageError ? (
          <img
            src={getThumbnailUrl()}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const fallbackUrl = VideoAPI.getThumbnailUrlViaAPI(video.id);
              if (target.src !== fallbackUrl) {
                target.src = fallbackUrl;
              } else {
                setImageError(true);
              }
            }}
          />
        ) : null}

        <div
          className={`absolute inset-0 flex items-center justify-center bg-surface-overlay ${
            getThumbnailUrl() && !imageError ? "hidden" : "flex"
          }`}
        >
          <PlayIcon className="h-10 w-10 text-ink-faint" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center shadow-glow translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <PlayIcon className="h-7 w-7 text-surface ml-0.5" />
          </div>
        </div>

        {video.duration > 0 && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-white text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            {formatDuration(video.duration)}
          </div>
        )}

        <div className={`absolute top-2.5 left-2.5 ${getStatusBadgeClass(video.status)}`}>
          {video.status}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-ink line-clamp-2 leading-snug group-hover:text-accent transition-colors">
          {video.title}
        </h3>

        {video.description && (
          <p className="text-sm text-ink-muted mt-1.5 line-clamp-2">
            {video.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] text-xs text-ink-faint">
          <span className="text-ink-muted">{displayUploaderName(video)}</span>
          <span>{new Date(video.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </article>
  );
};

export default VideoCard;
