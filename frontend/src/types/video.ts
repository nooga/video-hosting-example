export interface Video {
  id: string;
  title: string;
  description: string;
  uploaded_by: string;
  uploader_name?: string;
  uploader_avatar?: string;
  original_filename: string;
  duration: number;
  size: number;
  status: VideoStatus;
  formats: VideoFormat[];
  thumbnails: string[];
  created_at: string;
  updated_at: string;
}

export interface VideoFormat {
  quality: string;
  filename: string;
  size: number;
}

export type VideoStatus = "uploaded" | "processing" | "ready" | "failed";

export interface Job {
  id: string;
  video_id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  error_message?: string;
  worker_id?: string;
  payload: Record<string, any>;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export type JobType = "transcode" | "thumbnail";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface UploadResponse {
  video_id: string;
  message: string;
}

export interface VideoListResponse {
  videos: Video[];
  total: number;
  page: number;
  limit: number;
}

export interface JobsResponse {
  jobs: Job[];
  count: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface VideoPlayer {
  video: Video;
  currentQuality: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  fullscreen: boolean;
}

export interface UploadState {
  file: File | null;
  title: string;
  description: string;
  isUploading: boolean;
  progress: UploadProgress;
  error: string | null;
  success: boolean;
  videoId: string | null;
}
