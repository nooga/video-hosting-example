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
  const [controlsTimeout, setControlsTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

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

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => setDuration(videoElement.duration);
    const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

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

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    if (isPlaying) videoElement.play();
    else videoElement.pause();
  }, [isPlaying]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    videoElement.volume = volume;
    videoElement.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (fullscreen) {
      container.requestFullscreen?.();
    } else if (document.fullscreenElement === container) {
      document.exitFullscreen?.();
    }
  }, [fullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const isFs = document.fullscreenElement === containerRef.current;
      setFullscreen(isFs);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [setFullscreen]);

  const resetControlsTimeout = () => {
    if (controlsTimeout) clearTimeout(controlsTimeout);
    setShowControls(true);
    if (isPlaying) {
      const timeout = setTimeout(() => setShowControls(false), 3000);
      setControlsTimeout(timeout);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeout) clearTimeout(controlsTimeout);
    }
  }, [isPlaying, controlsTimeout]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const videoElement = videoRef.current;
    if (!videoElement || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newTime = ((e.clientX - rect.left) / rect.width) * duration;
    videoElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const qualities = getAvailableQualities();

  return (
    <div
      ref={containerRef}
      className={`video-player ${className}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && resetControlsTimeout()}
    >
      <video
        ref={videoRef}
        src={getStreamUrl()}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      <div
        className={`video-controls transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="player-scrub mb-4" onClick={handleSeek}>
          <div
            className="player-scrub-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="player-control-btn"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6" />
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="player-control-btn"
                aria-label={muted ? "Unmute" : "Mute"}
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
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  setMuted(v === 0);
                }}
                className="player-volume"
                aria-label="Volume"
              />
            </div>

            <span className="text-white/80 text-xs sm:text-sm font-medium tabular-nums ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="player-control-btn"
                aria-label="Quality"
                aria-expanded={showQualityMenu}
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
              {showQualityMenu && qualities.length > 0 && (
                <div className="quality-menu">
                  {qualities.map((quality) => (
                    <button
                      key={quality}
                      type="button"
                      onClick={() => {
                        setCurrentQuality(quality);
                        setShowQualityMenu(false);
                      }}
                      className={`quality-button ${
                        quality === currentQuality ? "active" : ""
                      }`}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="player-control-btn"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
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

      {video.status === "processing" &&
        (!video.formats || video.formats.length === 0) && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-sm p-6">
            <div className="text-center text-white max-w-xs">
              <div className="relative h-12 w-12 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-white/20" />
                <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">
                Processing…
              </h3>
              <p className="text-sm text-white/70 loading-pulse">
                Transcoding in progress. Check back shortly.
              </p>
            </div>
          </div>
        )}

      {video.status === "failed" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <p className="text-red-400 font-medium">Failed to process video</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
