import axios, { AxiosProgressEvent } from "axios";
import {
  Video,
  VideoListResponse,
  UploadResponse,
  Job,
  JobsResponse,
  UploadProgress,
  ApiError,
} from "../types/video";

// Declare window.ENV type
declare global {
  interface Window {
    ENV?: {
      REACT_APP_API_URL?: string;
      REACT_APP_MINIO_URL?: string;
    };
  }
}

// Get configuration from runtime config or environment variables
const getConfig = () => {
  const runtimeConfig = window.ENV || {};
  const isDev = process.env.NODE_ENV === "development";

  // In development, prefer CRA proxy by using relative baseURL when no runtime config is injected
  const apiUrl =
    runtimeConfig.REACT_APP_API_URL ||
    (isDev ? "" : process.env.REACT_APP_API_URL || "http://localhost:8080");

  const minioUrl =
    runtimeConfig.REACT_APP_MINIO_URL ||
    process.env.REACT_APP_MINIO_URL ||
    "http://localhost:9000";

  return { apiUrl, minioUrl };
};

const config = getConfig();
const API_BASE_URL = config.apiUrl;

console.log("API Configuration:", {
  API_BASE_URL,
  MINIO_URL: config.minioUrl,
  source: window.ENV
    ? "runtime"
    : process.env.NODE_ENV === "development"
    ? "development-proxy"
    : "environment",
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Token is dynamically attached by setAuthTokenGetter if configured
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError: ApiError = {
      error: error.response?.data?.error || error.message || "Unknown error",
      message: error.response?.data?.message,
    };
    return Promise.reject(apiError);
  }
);

export class VideoAPI {
  // Allow integrating with Auth0 for token retrieval
  private static getToken: (() => Promise<string | null>) | null = null;

  static setAuthTokenGetter(getter: () => Promise<string | null>) {
    this.getToken = getter;
    // Attach a request interceptor once to fetch token before each request
    api.interceptors.request.use(async (config) => {
      if (this.getToken) {
        try {
          const token = await this.getToken();
          if (token) {
            config.headers = config.headers || {};
            (config.headers as any).Authorization = `Bearer ${token}`;
          }
        } catch (_) {
          // ignore token fetch errors
        }
      }
      return config;
    });
  }

  // Health check
  static async checkHealth(): Promise<{ status: string; service: string }> {
    const response = await api.get("/health");
    return response.data;
  }

  // Upload video
  static async uploadVideo(
    file: File,
    title: string,
    description: string,
    uploadedBy: string = "anonymous",
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("uploaded_by", uploadedBy);

    const response = await api.post("/api/v1/videos/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            ),
          };
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // Get videos list
  static async getVideos(
    page: number = 1,
    limit: number = 20
  ): Promise<VideoListResponse> {
    const response = await api.get("/api/v1/videos", {
      params: { page, limit },
    });
    return response.data;
  }

  // Get video by ID
  static async getVideo(videoId: string): Promise<Video> {
    const response = await api.get(`/api/v1/videos/${videoId}`);
    return response.data;
  }

  // Get video stream URL
  static getVideoStreamUrl(
    videoId: string,
    quality: string = "original"
  ): string {
    return `${API_BASE_URL}/api/v1/videos/${videoId}/stream?quality=${quality}`;
  }

  // Get thumbnail URL
  static getThumbnailUrl(thumbnailPath: string): string {
    // Use MinIO URL if available, otherwise use backend API
    const currentConfig = getConfig();
    const minioUrl =
      currentConfig.minioUrl || `${API_BASE_URL.replace(":8080", ":9000")}`;
    return `${minioUrl}/thumbnails/${thumbnailPath}`;
  }

  // Get thumbnail URL via backend API (fallback)
  static getThumbnailUrlViaAPI(videoId: string): string {
    return `${API_BASE_URL}/api/v1/videos/${videoId}/thumbnail`;
  }

  // Trigger video processing
  static async processVideo(
    videoId: string
  ): Promise<{ message: string; video_id: string }> {
    const response = await api.post(`/api/v1/videos/${videoId}/process`);
    return response.data;
  }

  // Get job by ID
  static async getJob(jobId: string): Promise<Job> {
    const response = await api.get(`/api/v1/jobs/${jobId}`);
    return response.data;
  }

  // Get jobs for video
  static async getJobsForVideo(videoId: string): Promise<JobsResponse> {
    const response = await api.get(`/api/v1/jobs/video/${videoId}`);
    return response.data;
  }

  // Get active jobs
  static async getActiveJobs(): Promise<JobsResponse> {
    const response = await api.get("/api/v1/jobs/active");
    return response.data;
  }

  // Search videos
  static async searchVideos(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<VideoListResponse> {
    const response = await api.get("/api/v1/videos", {
      params: { q: query, page, limit },
    });
    return response.data;
  }
}

// Export default instance
export default api;
