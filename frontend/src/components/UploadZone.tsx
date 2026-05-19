import React, { useState, useRef, DragEvent } from "react";
import { CloudArrowUpIcon, VideoCameraIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useAuth0 } from "@auth0/auth0-react";
import { useUpload } from "../hooks/useUpload";
import ProgressBar from "./ProgressBar";
import { auth0ProfileName } from "../utils/displayName";

interface UploadZoneProps {
  onUploadComplete?: (videoId: string) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
  const { user } = useAuth0();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadState,
    setFile,
    setTitle,
    setDescription,
    uploadVideo,
    resetUpload,
    validateFile,
  } = useUpload();

  const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
    e.target.value = "";
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }
    setFile(file);
  };

  const handleUpload = async () => {
    const videoId = await uploadVideo(auth0ProfileName(user), user?.picture);
    if (videoId && onUploadComplete) onUploadComplete(videoId);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (uploadState.success) {
    return (
      <div className="card-glass p-8 text-center animate-fade-in">
        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500/15 mb-4">
          <CheckCircleIcon className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="font-display font-semibold text-lg text-ink mb-2">
          Upload complete
        </h3>
        <p className="text-sm text-ink-muted mb-6">
          Your video is being processed. You can watch progress on the detail page.
        </p>
        <button onClick={resetUpload} className="btn-secondary">
          Upload another
        </button>
      </div>
    );
  }

  return (
    <div className="card-glass p-6 sm:p-8 animate-fade-up">
      <h2 className="font-display text-xl font-bold text-ink mb-6">Upload video</h2>

      {!uploadState.file ? (
        <label
          htmlFor="video-file-upload"
          className={`upload-zone block ${isDragOver ? "drag-over" : ""}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            id="video-file-upload"
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.avi,.mov,.wmv,.webm"
            onChange={handleFileInputChange}
            className="sr-only"
          />
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-accent mb-4" />
          <p className="text-lg font-semibold text-ink mb-1">
            Drop your video here
          </p>
          <p className="text-sm text-ink-muted mb-3">or click to browse</p>
          <p className="text-xs text-ink-faint">
            MP4, AVI, MOV, WMV, WebM · max 1GB
          </p>
        </label>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center">
              <VideoCameraIcon className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">
                {uploadState.file.name}
              </p>
              <p className="text-xs text-ink-faint mt-0.5">
                {formatFileSize(uploadState.file.size)}
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="btn-ghost text-ink-faint hover:text-ink px-2"
              disabled={uploadState.isUploading}
              aria-label="Remove file"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-ink-muted mb-1.5">
                Title <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={uploadState.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your video a title"
                className="input-field"
                disabled={uploadState.isUploading}
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-ink-muted mb-1.5">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={uploadState.description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional context for viewers"
                className="input-field resize-none"
                disabled={uploadState.isUploading}
              />
            </div>
          </div>

          {uploadState.isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Uploading…</span>
                <span className="text-accent font-medium">
                  {uploadState.progress.percentage}%
                </span>
              </div>
              <ProgressBar progress={uploadState.progress.percentage} />
              <p className="text-xs text-ink-faint">
                {formatFileSize(uploadState.progress.loaded)} of{" "}
                {formatFileSize(uploadState.progress.total)}
              </p>
            </div>
          )}

          {uploadState.error && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10">
              <p className="text-sm text-red-400">{uploadState.error}</p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploadState.isUploading || !uploadState.title.trim()}
            className="btn-primary w-full"
          >
            {uploadState.isUploading ? "Uploading…" : "Start upload"}
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
