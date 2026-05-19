import { useState, useCallback } from 'react';
import { VideoAPI } from '../services/api';
import { UploadState, UploadProgress, ApiError } from '../types/video';

export const useUpload = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    title: '',
    description: '',
    isUploading: false,
    progress: { loaded: 0, total: 0, percentage: 0 },
    error: null,
    success: false,
    videoId: null,
  });

  const setFile = useCallback((file: File | null) => {
    setUploadState(prev => ({
      ...prev,
      file,
      error: null,
      success: false,
    }));
  }, []);

  const setTitle = useCallback((title: string) => {
    setUploadState(prev => ({ ...prev, title }));
  }, []);

  const setDescription = useCallback((description: string) => {
    setUploadState(prev => ({ ...prev, description }));
  }, []);

  const resetUpload = useCallback(() => {
    setUploadState({
      file: null,
      title: '',
      description: '',
      isUploading: false,
      progress: { loaded: 0, total: 0, percentage: 0 },
      error: null,
      success: false,
      videoId: null,
    });
  }, []);

  const uploadVideo = useCallback(async (uploaderName?: string, uploaderAvatar?: string) => {
    if (!uploadState.file || !uploadState.title.trim()) {
      setUploadState(prev => ({
        ...prev,
        error: 'Please select a file and enter a title',
      }));
      return null;
    }

    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      error: null,
      progress: { loaded: 0, total: 0, percentage: 0 },
    }));

    try {
      const onProgress = (progress: UploadProgress) => {
        setUploadState(prev => ({
          ...prev,
          progress,
        }));
      };

      const response = await VideoAPI.uploadVideo(
        uploadState.file,
        uploadState.title,
        uploadState.description,
        "user",
        onProgress,
        uploaderName,
        uploaderAvatar
      );

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        success: true,
        videoId: response.video_id,
        progress: { loaded: 100, total: 100, percentage: 100 },
      }));

      return response.video_id;
    } catch (error) {
      const apiError = error as ApiError;
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: apiError.error || 'Upload failed',
      }));
      return null;
    }
  }, [uploadState.file, uploadState.title, uploadState.description]);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please select a valid video file (MP4, AVI, MOV, WMV, or WebM)';
    }

    // Check file size (1GB limit)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      return 'File size must be less than 1GB';
    }

    return null;
  }, []);

  return {
    uploadState,
    setFile,
    setTitle,
    setDescription,
    uploadVideo,
    resetUpload,
    validateFile,
  };
}; 