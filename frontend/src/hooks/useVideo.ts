import { useState, useEffect, useCallback, useRef } from "react";
import { VideoAPI } from "../services/api";
import {
  Video,
  Job,
  VideoListResponse,
  JobsResponse,
  ApiError,
} from "../types/video";

export const useVideo = (videoId?: string) => {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoPollIntervalRef = useRef<number | null>(null);
  const videoInFlightRef = useRef<boolean>(false);

  const fetchVideo = useCallback(async () => {
    if (!videoId) return;

    setLoading(true);
    setError(null);

    try {
      const videoData = await VideoAPI.getVideo(videoId);
      setVideo(videoData);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.error);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  // Poll video details while processing to detect newly available formats
  useEffect(() => {
    if (!videoId) return;

    // Ensure single interval
    if (videoPollIntervalRef.current) {
      clearInterval(videoPollIntervalRef.current);
      videoPollIntervalRef.current = null;
    }

    const id = window.setInterval(async () => {
      if (videoInFlightRef.current) return;
      videoInFlightRef.current = true;
      try {
        const latest = await VideoAPI.getVideo(videoId);
        setVideo((prev) => {
          try {
            const same = JSON.stringify(prev) === JSON.stringify(latest);
            return same ? prev : latest;
          } catch {
            return latest;
          }
        });
        if (latest.status === "ready" || latest.status === "failed") {
          if (videoPollIntervalRef.current) {
            clearInterval(videoPollIntervalRef.current);
            videoPollIntervalRef.current = null;
          }
        }
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.error);
      } finally {
        videoInFlightRef.current = false;
      }
    }, 5000);

    videoPollIntervalRef.current = id;

    return () => {
      if (videoPollIntervalRef.current) {
        clearInterval(videoPollIntervalRef.current);
        videoPollIntervalRef.current = null;
      }
      videoInFlightRef.current = false;
    };
  }, [videoId]);

  return { video, loading, error, refetch: fetchVideo };
};

export const useVideoList = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchVideos = useCallback(
    async (pageNum: number = 1, reset: boolean = false) => {
      setLoading(true);
      setError(null);

      try {
        const response: VideoListResponse = await VideoAPI.getVideos(
          pageNum,
          20
        );

        if (reset) {
          setVideos(response.videos);
        } else {
          setVideos((prev) => [...prev, ...response.videos]);
        }

        setHasMore(response.videos.length === 20);
        setPage(pageNum);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchVideos(page + 1, false);
    }
  }, [fetchVideos, loading, hasMore, page]);

  const refresh = useCallback(() => {
    fetchVideos(1, true);
  }, [fetchVideos]);

  useEffect(() => {
    fetchVideos(1, true);
  }, [fetchVideos]);

  return {
    videos,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
};

export const useJobs = (videoId?: string) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const inFlightRef = useRef<boolean>(false);

  const fetchJobs = useCallback(
    async (showLoading: boolean = false) => {
      if (!videoId) return;
      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      try {
        const response: JobsResponse = await VideoAPI.getJobsForVideo(videoId);
        setJobs(response.jobs);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.error);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [videoId]
  );

  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  // Poll for job updates when video is processing
  useEffect(() => {
    if (!videoId) return;

    // Ensure a single interval exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const id = window.setInterval(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const response: JobsResponse = await VideoAPI.getJobsForVideo(videoId);
        setJobs((prev) => {
          try {
            const same = JSON.stringify(prev) === JSON.stringify(response.jobs);
            return same ? prev : response.jobs;
          } catch {
            return response.jobs;
          }
        });
        const hasProcessing = response.jobs.some(
          (j) => j.status === "processing" || j.status === "pending"
        );
        if (!hasProcessing && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.error);
      } finally {
        inFlightRef.current = false;
      }
    }, 5000); // Poll every 5 seconds

    intervalRef.current = id;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [videoId]);

  const getJobProgress = useCallback(() => {
    if (jobs.length === 0) return 0;

    const totalProgress = jobs.reduce((sum, job) => sum + job.progress, 0);
    return Math.round(totalProgress / jobs.length);
  }, [jobs]);

  const getJobStatus = useCallback(() => {
    if (jobs.length === 0) return "pending";

    const hasProcessing = jobs.some((job) => job.status === "processing");
    const hasCompleted = jobs.every((job) => job.status === "completed");
    const hasFailed = jobs.some((job) => job.status === "failed");

    if (hasFailed) return "failed";
    if (hasCompleted) return "completed";
    if (hasProcessing) return "processing";
    return "pending";
  }, [jobs]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs,
    getJobProgress,
    getJobStatus,
  };
};

export const useVideoPlayer = (video: Video | null) => {
  const [currentQuality, setCurrentQuality] = useState<string>("original");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const getStreamUrl = useCallback(() => {
    if (!video) return "";
    return VideoAPI.getVideoStreamUrl(video.id, currentQuality);
  }, [video, currentQuality]);

  const getAvailableQualities = useCallback(() => {
    if (!video) return ["original"];

    const qualities = ["original", ...video.formats.map((f) => f.quality)];
    return qualities.filter(
      (quality, index) => qualities.indexOf(quality) === index
    );
  }, [video]);

  // Set default quality to 480p if available
  useEffect(() => {
    if (video && video.formats) {
      const availableQualities = getAvailableQualities();

      // Check if 480p is available
      if (availableQualities.includes("480p")) {
        setCurrentQuality("480p");
      } else if (availableQualities.includes("720p")) {
        // Fallback to 720p if 480p is not available
        setCurrentQuality("720p");
      } else if (availableQualities.length > 1) {
        // Use the first non-original quality if available
        const nonOriginalQualities = availableQualities.filter(
          (q) => q !== "original"
        );
        if (nonOriginalQualities.length > 0) {
          setCurrentQuality(nonOriginalQualities[0]);
        }
      }
    }
  }, [video, getAvailableQualities]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((prev) => !prev);
  }, []);

  return {
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
  };
};
