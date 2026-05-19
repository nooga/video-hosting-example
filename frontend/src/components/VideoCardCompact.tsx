import React from "react";
import { Video } from "../types/video";
import { VideoAPI } from "../services/api";
import { displayUploaderName } from "../utils/displayName";

interface VideoCardCompactProps {
  video: Video;
  onClick?: (video: Video) => void;
}

const VideoCardCompact: React.FC<VideoCardCompactProps> = ({
  video,
  onClick,
}) => {
  const thumbnail =
    video.thumbnails && video.thumbnails.length > 0
      ? VideoAPI.getThumbnailUrl(video.thumbnails[0])
      : VideoAPI.getThumbnailUrlViaAPI(video.id);

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow transition"
      onClick={() => onClick?.(video)}
    >
      <div
        className="relative w-full bg-gray-200"
        style={{ aspectRatio: "16/9" }}
      >
        <img
          src={thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 p-2 bg-gradient-to-b from-black/60 to-transparent text-white">
          <div className="text-xs opacity-90">By {displayUploaderName(video)}</div>
          <div className="text-sm font-semibold line-clamp-1">
            {video.title}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCardCompact;
