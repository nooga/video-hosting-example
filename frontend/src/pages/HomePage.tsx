import React, { useState } from "react";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useVideoList } from "../hooks/useVideo";
import VideoCard from "../components/VideoCard";
import UploadZone from "../components/UploadZone";
import { Video } from "../types/video";
import Logo from "../components/Logo";
import { useAuth0 } from "@auth0/auth0-react";

const HomePage: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { videos, loading, error, hasMore, loadMore, refresh } = useVideoList();
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();

  const handleVideoClick = (video: Video) => {
    // Navigate to video detail page
    window.location.href = `/video/${video.id}`;
  };

  const handleUploadComplete = (videoId: string) => {
    setShowUpload(false);
    refresh(); // Refresh video list
    // Navigate to the uploaded video
    window.location.href = `/video/${videoId}`;
  };

  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Logo size={28} showWordmark wordmarkText="VideoHost" />
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Auth and Upload Buttons */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="btn-primary"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Upload Video
                  </button>
                  <button
                    onClick={() =>
                      logout({
                        logoutParams: { returnTo: window.location.origin },
                      })
                    }
                    className="btn-secondary"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => loginWithRedirect()}
                  className="btn-primary"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        {showUpload && isAuthenticated && (
          <div className="mb-8">
            <UploadZone onUploadComplete={handleUploadComplete} />
          </div>
        )}
        {showUpload && !isAuthenticated && (
          <div className="mb-8">
            <div className="card p-6">
              <p className="text-sm text-gray-700">
                Please sign in to upload videos.
              </p>
            </div>
          </div>
        )}

        {/* Video Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {searchQuery
                ? `Search Results (${filteredVideos.length})`
                : "All Videos"}
            </h2>
            <button
              onClick={refresh}
              className="btn-secondary"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">Error loading videos: {error}</p>
            </div>
          )}

          {filteredVideos.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No videos found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery
                    ? "Try a different search term"
                    : "Get started by uploading a video"}
                </p>
                {!searchQuery && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowUpload(true)}
                      className="btn-primary"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Upload Your First Video
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={handleVideoClick}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && filteredVideos.length > 0 && !searchQuery && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? "Loading..." : "Load More Videos"}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>&copy; 2025 MonkOS Inc. Powered by Go, React, and FFmpeg.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
