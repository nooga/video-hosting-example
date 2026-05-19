import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  ShareIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { useVideo, useJobs, useVideoList } from "../hooks/useVideo";
import SiteHeader from "../components/SiteHeader";
import VideoPlayer from "../components/VideoPlayer";
import JobStatus from "../components/JobStatus";
import Comments from "../components/Comments";
import { VideoAPI } from "../services/api";
import { displayUploaderName } from "../utils/displayName";

const VideoDetailPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { video, loading: videoLoading, error: videoError } = useVideo(videoId);
  const { jobs, loading: jobsLoading, getJobStatus } = useJobs(videoId);
  const { videos: allVideos } = useVideoList();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    if (!video || downloading) return;
    setDownloading(true);
    const quality = VideoAPI.pickBestDownloadQuality(video);
    VideoAPI.triggerVideoDownload(video.id, quality);
    window.setTimeout(() => setDownloading(false), 1500);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleShare = async () => {
    if (navigator.share && video) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description,
          url: window.location.href,
        });
      } catch {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (videoLoading) {
    return (
      <div className="page-shell">
        <SiteHeader variant="detail" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <div className="animate-pulse space-y-6">
            <div className="aspect-video bg-surface-overlay rounded-2xl border border-theme" />
            <div className="h-8 bg-surface-overlay rounded-xl w-3/4 border border-theme" />
            <div className="h-4 bg-surface-overlay rounded w-1/3 border border-theme" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-48 bg-surface-overlay rounded-2xl border border-theme" />
              <div className="h-64 bg-surface-overlay rounded-2xl border border-theme" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (videoError || !video) {
    return (
      <div className="page-shell">
        <SiteHeader variant="detail" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center card-glass p-10 max-w-md">
            <h2 className="font-display text-2xl font-bold text-ink mb-3">
              Video not found
            </h2>
            <p className="text-ink-muted mb-8">
              {videoError || "This video doesn't exist or was removed."}
            </p>
            <Link to="/" className="btn-primary">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <SiteHeader variant="detail" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-8">
          <div className="video-container rounded-2xl overflow-hidden shadow-card border border-theme">
            <VideoPlayer video={video} autoPlay={false} />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6 min-w-0">
            <div className="card-glass p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight">
                    {video.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 text-sm text-ink-muted">
                    <span>{displayUploaderName(video)}</span>
                    <span className="text-ink-faint">·</span>
                    <span>{new Date(video.created_at).toLocaleDateString()}</span>
                    {video.duration > 0 && (
                      <>
                        <span className="text-ink-faint">·</span>
                        <span>{formatDuration(video.duration)}</span>
                      </>
                    )}
                    {video.formats && video.formats.length > 0 && (
                      <>
                        <span className="text-ink-faint">·</span>
                        <div className="flex flex-wrap gap-1.5">
                          {video.formats.map((format, index) => (
                            <span
                              key={index}
                              className="badge-default"
                              title={formatFileSize(format.size)}
                            >
                              {format.quality}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleShare}
                    className="btn-secondary p-2.5"
                    aria-label="Share"
                  >
                    <ShareIcon className="h-4 w-4" />
                  </button>
                  {video.status === "ready" && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={downloading}
                      className="btn-secondary p-2.5 disabled:opacity-60"
                      aria-label="Download"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {video.description && (
                <p className="text-ink-muted leading-relaxed whitespace-pre-wrap border-t border-theme pt-5">
                  {video.description}
                </p>
              )}
            </div>

            <Comments videoId={video.id} />
          </div>

          <aside className="lg:w-80 flex-shrink-0 space-y-4">
            {getJobStatus() === "completed" ? (
              <>
                <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider">
                  More videos
                </h3>
                {(() => {
                  const related = allVideos.filter(
                    (v) => v.id !== video.id && v.status === "ready"
                  );
                  if (related.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-theme bg-white/[0.02] p-6 text-center">
                        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-muted">
                          <svg
                            className="h-5 w-5 text-accent"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-ink">
                          Nothing else to watch yet
                        </p>
                        <p className="mt-1 text-xs text-ink-faint leading-relaxed">
                          Upload more videos and they&apos;ll show up here as
                          recommendations.
                        </p>
                        <Link to="/" className="btn-secondary mt-4 inline-flex">
                          Browse library
                        </Link>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {related.slice(0, 3).map((v) => (
                        <Link
                          key={v.id}
                          to={`/video/${v.id}`}
                          className="group block rounded-xl overflow-hidden border border-theme bg-surface-raised hover:border-accent/30 hover:shadow-card transition-all duration-300"
                        >
                          <div
                            className="relative w-full bg-surface-overlay"
                            style={{ aspectRatio: "16/9" }}
                          >
                            <img
                              src={
                                v.thumbnails && v.thumbnails.length > 0
                                  ? VideoAPI.getThumbnailUrl(v.thumbnails[0])
                                  : VideoAPI.getThumbnailUrlViaAPI(v.id)
                              }
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const fallback = VideoAPI.getThumbnailUrlViaAPI(v.id);
                                if (target.src !== fallback) {
                                  target.src = fallback;
                                }
                              }}
                            />
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                              <p className="text-xs text-white/70 truncate">
                                {displayUploaderName(v)}
                              </p>
                              <p className="text-sm font-semibold text-white line-clamp-2">
                                {v.title}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  );
                })()}
              </>
            ) : (
              <JobStatus jobs={jobs} loading={jobsLoading} />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default VideoDetailPage;
