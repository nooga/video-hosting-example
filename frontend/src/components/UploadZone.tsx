import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { CloudArrowUpIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { useUpload } from '../hooks/useUpload';
import ProgressBar from './ProgressBar';
import confetti from 'canvas-confetti';

interface UploadZoneProps {
  onUploadComplete?: (videoId: string) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
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

  // Fire confetti when upload succeeds
  useEffect(() => {
    if (uploadState.success) {
      // Initial big burst
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#c084fc', '#e9d5ff', '#7e22ce', '#22d3ee', '#f472b6', '#facc15'],
      });

      // Secondary bursts from the sides
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: ['#a855f7', '#c084fc', '#22d3ee', '#facc15'],
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: ['#a855f7', '#c084fc', '#f472b6', '#facc15'],
        });
      }, 250);

      // Final sparkle burst
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#a855f7', '#e9d5ff', '#22d3ee', '#f472b6'],
          ticks: 200,
          gravity: 0.8,
        });
      }, 500);
    }
  }, [uploadState.success]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
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
    const videoId = await uploadVideo();
    if (videoId && onUploadComplete) {
      onUploadComplete(videoId);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadState.success) {
    return (
      <div className="card p-6 text-center celebrate-entrance">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-900/40 border border-green-700/50 mb-4">
          <VideoCameraIcon className="h-6 w-6 text-green-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-100 mb-2">Upload Successful!</h3>
        <p className="text-sm text-gray-400 mb-4">
          Your video has been uploaded and is being processed.
        </p>
        <button
          onClick={resetUpload}
          className="btn-secondary"
        >
          Upload Another Video
        </button>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold text-gray-100 mb-6">Upload Video</h2>
      
      {!uploadState.file ? (
        <div
          className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <p className="text-lg font-medium text-gray-200 mb-2">
            Drag and drop your video here
          </p>
          <p className="text-sm text-gray-400 mb-4">
            or click to select a file
          </p>
          <p className="text-xs text-gray-600">
            Supports MP4, AVI, MOV, WMV, WebM (max 1GB)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File Info */}
          <div className="flex items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
            <VideoCameraIcon className="h-8 w-8 text-gray-500 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-200">
                {uploadState.file.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(uploadState.file.size)}
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              disabled={uploadState.isUploading}
            >
              ×
            </button>
          </div>

          {/* Video Details Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={uploadState.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title"
                className="w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                disabled={uploadState.isUploading}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={uploadState.description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter video description (optional)"
                className="w-full rounded-md bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                disabled={uploadState.isUploading}
              />
            </div>
          </div>

          {/* Upload Progress */}
          {uploadState.isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Uploading...</span>
                <span className="text-gray-400">{uploadState.progress.percentage}%</span>
              </div>
              <ProgressBar 
                progress={uploadState.progress.percentage} 
                color="bg-purple-500"
              />
              <p className="text-xs text-gray-500">
                {formatFileSize(uploadState.progress.loaded)} of {formatFileSize(uploadState.progress.total)}
              </p>
            </div>
          )}

          {/* Error Message */}
          {uploadState.error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-md">
              <p className="text-sm text-red-400">{uploadState.error}</p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploadState.isUploading || !uploadState.title.trim()}
            className="btn-primary w-full"
          >
            {uploadState.isUploading ? 'Uploading...' : 'Upload Video'}
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadZone;