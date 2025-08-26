import React, { useRef, useEffect, useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";
import { Video } from "../types/video";
import { useVideoPlayer } from "../hooks/useVideo";

interface VideoPlayerProps {
  video: Video;
  autoPlay?: boolean;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  autoPlay = false,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const {
    currentQuality,
    setCurrentQuality,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume,
    muted,
    setMuted,
    fullscreen,
    setFullscreen,
    getStreamUrl,
    getAvailableQualities,
    togglePlay,
    toggleMute,
    toggleFullscreen,
  } = useVideoPlayer(video);

  // Video event handlers
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("play", handlePlay);
    videoElement.addEventListener("pause", handlePause);

    return () => {
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("play", handlePlay);
      videoElement.removeEventListener("pause", handlePause);
    };
  }, [setDuration, setCurrentTime, setIsPlaying]);

  // Handle play/pause
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.volume = volume;
    videoElement.muted = muted;
  }, [volume, muted]);

  // Handle fullscreen
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (fullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }, [fullscreen]);

  // Auto-hide controls
  const resetControlsTimeout = () => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    setShowControls(true);

    if (isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    }
  };

  // Show controls when paused
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    }
  }, [isPlaying, controlsTimeout]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const videoElement = videoRef.current;
    if (!videoElement || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;

    videoElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const qualities = getAvailableQualities();

  return (
    <div
      ref={containerRef}
      className={`video-player ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          resetControlsTimeout();
        }
      }}
    >
      <video
        ref={videoRef}
        src={getStreamUrl()}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Controls Overlay */}
      <div
        className={`video-controls transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <div
            className="w-full h-1 bg-white/30 rounded cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-red-500 rounded"
              style={{
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6" />
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {muted || volume === 0 ? (
                  <SpeakerXMarkIcon className="h-5 w-5" />
                ) : (
                  <SpeakerWaveIcon className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  setMuted(newVolume === 0);
                }}
                className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Time */}
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Quality Selector */}
            <div className="relative flex items-center">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                aria-label="Change quality"
                className="text-white hover:text-gray-300 transition-colors p-2 rounded focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>

              {showQualityMenu && (
                <div className="absolute bottom-10 right-0 bg-black/90 rounded-md py-2 min-w-24 shadow-lg ring-1 ring-white/10 z-30">
                  {qualities.map((quality) => (
                    <button
                      key={quality}
                      onClick={() => {
                        setCurrentQuality(quality);
                        setShowQualityMenu(false);
                      }}
                      className={`quality-button block w-full text-left px-3 py-1 ${
                        quality === currentQuality ? "active" : ""
                      }`}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {fullscreen ? (
                <ArrowsPointingInIcon className="h-5 w-5" />
              ) : (
                <ArrowsPointingOutIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading/Error States */}
      {video.status === "processing" &&
        (!video.formats || video.formats.length === 0) && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/50 p-6">
            <div className="text-center text-white">
              <div className="relative h-12 w-12 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
              </div>
              <h3 className="text-lg font-medium mb-1">Processing Video…</h3>
              <p className="text-sm text-gray-200 loading-pulse">
                Your video is being transcoded and will be ready shortly.
              </p>
            </div>
          </div>
        )}

      {video.status === "failed" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <p>Failed to process video</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
