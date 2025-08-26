import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  ShareIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { useVideo, useJobs, useVideoList } from "../hooks/useVideo";
import Logo from "../components/Logo";
import VideoPlayer from "../components/VideoPlayer";
import JobStatus from "../components/JobStatus";
import Comments from "../components/Comments";
import { VideoAPI } from "../services/api";

const VideoDetailPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { video, loading: videoLoading, error: videoError } = useVideo(videoId);
  const { jobs, loading: jobsLoading, getJobStatus } = useJobs(videoId);
  const { videos: allVideos } = useVideoList();

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
      } catch (err) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (videoLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="aspect-w-16 aspect-h-9 bg-gray-300 rounded-lg mb-6"></div>
            <div className="h-8 bg-gray-300 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-32 bg-gray-300 rounded"></div>
              </div>
              <div className="h-64 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (videoError || !video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Video Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {videoError || "The video you're looking for doesn't exist."}
          </p>
          <Link to="/" className="btn-primary">
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Videos
            </Link>
            <Logo size={24} showWordmark wordmarkText="VideoHost" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Video Player */}
        <div className="mb-8">
          <div className="video-container bg-black rounded-lg overflow-hidden">
            <VideoPlayer video={video} autoPlay={false} />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Video Info */}
          <div className="flex-1 space-y-6">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {video.title}
                  </h1>
                  <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
                    <span className="mr-2">By {video.uploaded_by}</span>
                    <span>•</span>
                    <span>
                      {new Date(video.created_at).toLocaleDateString()}
                    </span>
                    {video.duration > 0 && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(video.duration)}</span>
                      </>
                    )}
                    {/* Show format pills inline instead of file size */}
                    {video.formats && video.formats.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {video.formats.map((format, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
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
                <div className="flex items-center space-x-2">
                  <button onClick={handleShare} className="btn-secondary">
                    <ShareIcon className="h-4 w-4" />
                  </button>
                  {video.status === "ready" && (
                    <a
                      href={`/api/v1/videos/${video.id}/stream`}
                      download
                      className="btn-secondary"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              {/* Description */}
              {video.description && (
                <div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {video.description}
                  </p>
                </div>
              )}
            </div>
            <Comments />
          </div>

          {/* Sidebar: processing status or suggestions */}
          <div className="lg:w-80 flex-shrink-0">
            {getJobStatus() === "completed" ? (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-900">
                  More videos
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {allVideos
                    .filter((v) => v.id !== video.id && v.status === "ready")
                    .slice(0, 3)
                    .map((v) => (
                      <Link
                        key={v.id}
                        to={`/videos/${v.id}`}
                        className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow transition"
                      >
                        <div
                          className="relative w-full bg-gray-200"
                          style={{ aspectRatio: "16/9" }}
                        >
                          <img
                            src={
                              v.thumbnails && v.thumbnails.length > 0
                                ? VideoAPI.getThumbnailUrl(v.thumbnails[0])
                                : VideoAPI.getThumbnailUrlViaAPI(v.id)
                            }
                            alt={v.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 top-0 p-2 bg-gradient-to-b from-black/60 to-transparent text-white">
                            <div className="text-xs opacity-90">
                              By {v.uploaded_by}
                            </div>
                            <div className="text-sm font-semibold line-clamp-1">
                              {v.title}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            ) : (
              <JobStatus jobs={jobs} loading={jobsLoading} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoDetailPage;
