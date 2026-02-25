import React, { useState } from "react";
import { PlayIcon, ClockIcon } from "@heroicons/react/24/solid";
import { Video } from "../types/video";
import { VideoAPI } from "../services/api";

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "ready":
        return "bg-green-900/60 text-green-300 border border-green-700/50";
      case "processing":
        return "bg-yellow-900/60 text-yellow-300 border border-yellow-700/50";
      case "failed":
        return "bg-red-900/60 text-red-300 border border-red-700/50";
      default:
        return "bg-gray-800 text-gray-400 border border-gray-700";
    }
  };

  const getThumbnailUrl = (): string => {
    if (video.thumbnails && video.thumbnails.length > 0) {
      return VideoAPI.getThumbnailUrl(video.thumbnails[0]);
    }
    return ""; // Will trigger fallback
  };

  return (
    <div className="video-card cursor-pointer" onClick={() => onClick?.(video)}>
      {/* Thumbnail */}
      <div
        className="relative w-full bg-gray-800"
        style={{ aspectRatio: "16/9" }}
      >
        {getThumbnailUrl() && !imageError ? (
          <img
            src={getThumbnailUrl()}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Try fallback URL via backend API
              const fallbackUrl = VideoAPI.getThumbnailUrlViaAPI(video.id);
              if (target.src !== fallbackUrl) {
                target.src = fallbackUrl;
              } else {
                // Both URLs failed, show fallback content
                setImageError(true);
              }
            }}
          />
        ) : null}

        {/* Fallback content when no thumbnail */}
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            getThumbnailUrl() && !imageError ? "hidden" : "block"
          }`}
        >
          <div className="text-center">
            <div
              className={`w-16 h-16 rounded-full mb-2 mx-auto flex items-center justify-center ${
                video.status === "ready"
                  ? "bg-green-900/40"
                  : video.status === "processing"
                  ? "bg-yellow-900/40"
                  : video.status === "failed"
                  ? "bg-red-900/40"
                  : "bg-gray-800"
              }`}
            >
              <PlayIcon
                className={`h-8 w-8 ${
                  video.status === "ready"
                    ? "text-green-400"
                    : video.status === "processing"
                    ? "text-yellow-400"
                    : video.status === "failed"
                    ? "text-red-400"
                    : "text-gray-500"
                }`}
              />
            </div>
            <p className="text-xs text-gray-500">
              {video.status === "processing"
                ? "Processing..."
                : video.status === "failed"
                ? "Failed"
                : video.status === "ready"
                ? "Ready"
                : "Uploaded"}
            </p>
          </div>
        </div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50">
          <PlayIcon className="h-12 w-12 text-white" />
        </div>

        {/* Duration Badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            <ClockIcon className="h-3 w-3 inline mr-1" />
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Status Badge */}
        <div
          className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
            video.status
          )}`}
        >
          {video.status}
        </div>
      </div>

      {/* Video Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-100 mb-2 line-clamp-2">
          {video.title}
        </h3>

        {video.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
            {video.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>By {video.uploader_name || video.uploaded_by}</span>
          <span>{formatFileSize(video.size)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
          <span>{new Date(video.created_at).toLocaleDateString()}</span>
          {video.formats && video.formats.length > 0 && (
            <span>{video.formats.length} quality options</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
