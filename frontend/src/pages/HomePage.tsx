import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useVideoList } from "../hooks/useVideo";
import VideoCard from "../components/VideoCard";
import UploadZone from "../components/UploadZone";
import SiteHeader from "../components/SiteHeader";
import { Video } from "../types/video";
import { useAuth0 } from "@auth0/auth0-react";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { videos, loading, error, hasMore, loadMore, refresh } = useVideoList();
  const { isAuthenticated } = useAuth0();

  const handleVideoClick = (video: Video) => {
    navigate(`/video/${video.id}`);
  };

  const handleUploadComplete = (videoId: string) => {
    setShowUpload(false);
    refresh();
    navigate(`/video/${videoId}`);
  };

  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-shell">
      <SiteHeader
        variant="home"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showUpload={showUpload}
        onToggleUpload={() => setShowUpload((s) => !s)}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <section className="mb-10">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-2">
            Your video library
          </p>
          <h1 className="section-title mb-3">
            {searchQuery
              ? `${filteredVideos.length} result${filteredVideos.length === 1 ? "" : "s"}`
              : "All videos"}
          </h1>
          <p className="text-ink-muted max-w-xl text-base">
            Upload, transcode, and share — everything stays in one place.
          </p>

          <div className="mt-4 sm:hidden relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </section>

        {showUpload && isAuthenticated && (
          <section className="mb-10">
            <UploadZone onUploadComplete={handleUploadComplete} />
          </section>
        )}
        {showUpload && !isAuthenticated && (
          <section className="mb-10 card-glass p-6">
            <p className="text-sm text-ink-muted">
              Please sign in to upload videos.
            </p>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wider">
              {searchQuery ? "Results" : "Recently added"}
            </h2>
            <button onClick={refresh} className="btn-ghost" disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10">
              <p className="text-red-400 text-sm">
                Error loading videos: {error}
              </p>
            </div>
          )}

          {filteredVideos.length === 0 && !loading && (
            <div className="card-glass p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center mb-4">
                <svg
                  className="h-8 w-8 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-ink text-lg">
                No videos yet
              </h3>
              <p className="mt-2 text-sm text-ink-muted max-w-sm mx-auto">
                {searchQuery
                  ? "Try a different search term."
                  : "Drop your first clip here and we'll handle the rest."}
              </p>
              {!searchQuery && isAuthenticated && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="btn-primary mt-6"
                >
                  <PlusIcon className="h-4 w-4" />
                  Upload your first video
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={handleVideoClick}
              />
            ))}
          </div>

          {hasMore && filteredVideos.length > 0 && !searchQuery && (
            <div className="text-center mt-10">
              <button
                onClick={loadMore}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-theme mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-ink-faint text-xs">
            © 2026 MonkOS · Go · React · FFmpeg
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
