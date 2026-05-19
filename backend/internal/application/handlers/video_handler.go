package handlers

import (
	"context"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"youtube-backend/internal/domain/entities"
	"youtube-backend/internal/domain/repositories"
	"youtube-backend/internal/domain/services"
	"youtube-backend/internal/infrastructure/storage"
	mw "youtube-backend/internal/interfaces/middleware"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.uber.org/zap"
)

type VideoHandler struct {
	videoService *services.VideoService
	minioClient  *storage.MinIOClient
	userRepo     repositories.UserRepository
	logger       *zap.Logger
}

type UploadResponse struct {
	VideoID string `json:"video_id"`
	Message string `json:"message"`
}

type VideoListResponse struct {
	Videos []VideoResponse `json:"videos"`
	Total  int64           `json:"total"`
	Page   int             `json:"page"`
	Limit  int             `json:"limit"`
}

type VideoResponse struct {
	ID               string                `json:"id"`
	Title            string                `json:"title"`
	Description      string                `json:"description"`
	UploadedBy       string                `json:"uploaded_by"`
	UploaderName     string                `json:"uploader_name"`
	UploaderAvatar   string                `json:"uploader_avatar"`
	OriginalFilename string                `json:"original_filename"`
	Duration         float64               `json:"duration"`
	Size             int64                 `json:"size"`
	Status           string                `json:"status"`
	Formats          []VideoFormatResponse `json:"formats"`
	Thumbnails       []string              `json:"thumbnails"`
	CreatedAt        time.Time             `json:"created_at"`
	UpdatedAt        time.Time             `json:"updated_at"`
}

type VideoFormatResponse struct {
	Quality  string `json:"quality"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
}

func NewVideoHandler(videoService *services.VideoService, minioClient *storage.MinIOClient, userRepo repositories.UserRepository, logger *zap.Logger) *VideoHandler {
	return &VideoHandler{
		videoService: videoService,
		minioClient:  minioClient,
		userRepo:     userRepo,
		logger:       logger,
	}
}

// UploadVideo handles video file uploads
func (h *VideoHandler) UploadVideo(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Parse multipart form
	err := c.Request.ParseMultipartForm(32 << 20) // 32MB max memory
	if err != nil {
		h.logger.Error("Failed to parse multipart form", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	// Get form fields
	title := c.PostForm("title")
	description := c.PostForm("description")
	uploadedBy := c.PostForm("uploaded_by")
	if sub := mw.GetAuthSubject(c); sub != "" {
		uploadedBy = sub
	}
	uploaderName := mw.GetAuthDisplayName(c)
	uploaderAvatar := mw.GetAuthPicture(c)
	// Prefer frontend profile when JWT / synced user only yields an opaque provider id.
	if formName := strings.TrimSpace(c.PostForm("uploader_name")); formName != "" {
		if uploaderName == "" || mw.IsOpaqueDisplayName(uploaderName) {
			if !mw.IsOpaqueDisplayName(formName) {
				uploaderName = formName
			}
		}
	}
	if uploaderAvatar == "" {
		uploaderAvatar = c.PostForm("uploader_avatar")
	}
	uploaderOID := mw.GetAuthUserID(c)

	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	if uploadedBy == "" {
		uploadedBy = "anonymous" // Default user
	}

	// Get uploaded file
	file, header, err := c.Request.FormFile("video")
	if err != nil {
		h.logger.Error("Failed to get uploaded file", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "No video file provided"})
		return
	}
	defer file.Close()

	// Validate file
	if header.Size == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Empty file"})
		return
	}

	// Create video record (pass uploader OID as optional arg)
	video, err := h.videoService.CreateVideo(ctx, title, description, uploadedBy, uploaderName, uploaderAvatar, header.Filename, header.Size, uploaderOID)
	if err != nil {
		h.logger.Error("Failed to create video record", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate unique filename for storage
	ext := filepath.Ext(header.Filename)
	objectName := "videos/original/" + video.ID.Hex() + ext

	// Upload file to MinIO
	err = h.minioClient.UploadFile(ctx, objectName, file, header.Size, "video/"+ext[1:])
	if err != nil {
		h.logger.Error("Failed to upload file to storage", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
		return
	}

	// Schedule processing jobs
	if err := h.videoService.ScheduleProcessingJobs(ctx, video.ID); err != nil {
		h.logger.Error("Failed to schedule processing jobs", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule processing jobs"})
		return
	}

	h.logger.Info("Video uploaded successfully",
		zap.String("video_id", video.ID.Hex()),
		zap.String("filename", header.Filename),
		zap.Int64("size", header.Size))

	c.JSON(http.StatusCreated, UploadResponse{
		VideoID: video.ID.Hex(),
		Message: "Video uploaded successfully and processing started",
	})
}

// GetVideos returns a paginated list of videos
func (h *VideoHandler) GetVideos(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Get videos
	videos, err := h.videoService.ListVideos(ctx, limit, offset)
	if err != nil {
		h.logger.Error("Failed to get videos", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get videos"})
		return
	}

	// Convert to response format
	videoResponses := make([]VideoResponse, len(videos))
	for i, video := range videos {
		videoResponses[i] = h.convertToVideoResponse(video)
	}

	c.JSON(http.StatusOK, VideoListResponse{
		Videos: videoResponses,
		Total:  int64(len(videos)), // TODO: Implement proper count
		Page:   page,
		Limit:  limit,
	})
}

// GetVideo returns a specific video by ID
func (h *VideoHandler) GetVideo(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	videoID := c.Param("id")
	if videoID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Video ID is required"})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video ID"})
		return
	}

	video, err := h.videoService.GetVideo(ctx, objectID)
	if err != nil {
		h.logger.Error("Failed to get video", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}

	c.JSON(http.StatusOK, h.convertToVideoResponse(video))
}

// StreamVideo handles video streaming
func (h *VideoHandler) StreamVideo(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	videoID := c.Param("id")
	quality := c.DefaultQuery("quality", "original")

	objectID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video ID"})
		return
	}

	// Get video record
	video, err := h.videoService.GetVideo(ctx, objectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}

	// Determine file path based on quality
	var objectName string
	if quality == "original" {
		ext := filepath.Ext(video.OriginalFilename)
		objectName = "videos/original/" + video.ID.Hex() + ext
	} else {
		// Look for specific quality format
		found := false
		for _, format := range video.Formats {
			if format.Quality == quality {
				objectName = "videos/processed/" + format.Filename
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusNotFound, gin.H{"error": "Quality not available"})
			return
		}
	}

	// Get file from MinIO
	object, err := h.minioClient.DownloadFile(ctx, objectName)
	if err != nil {
		h.logger.Error("Failed to get video file", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stream video"})
		return
	}
	defer object.Close()

	// Set appropriate headers
	c.Header("Content-Type", "video/mp4")
	c.Header("Accept-Ranges", "bytes")
	c.Header("Cache-Control", "public, max-age=3600")

	// Stream the file
	_, err = io.Copy(c.Writer, object)
	if err != nil {
		h.logger.Error("Failed to stream video", zap.Error(err))
	}
}

// ProcessVideo manually triggers video processing
func (h *VideoHandler) ProcessVideo(c *gin.Context) {
	videoID := c.Param("id")
	if videoID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Video ID is required"})
		return
	}

	// TODO: Implement manual processing trigger
	h.logger.Info("Manual processing triggered", zap.String("video_id", videoID))

	c.JSON(http.StatusAccepted, gin.H{
		"message":  "Processing triggered",
		"video_id": videoID,
	})
}

// GetThumbnail serves video thumbnails from MinIO storage
func (h *VideoHandler) GetThumbnail(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	videoID := c.Param("id")
	if videoID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Video ID is required"})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid video ID"})
		return
	}

	// Get video record to check if thumbnails exist
	video, err := h.videoService.GetVideo(ctx, objectID)
	if err != nil {
		h.logger.Error("Failed to get video", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}

	// Check if video has thumbnails
	if len(video.Thumbnails) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No thumbnail available for this video"})
		return
	}

	// Use the first thumbnail (typically there's only one)
	thumbnailFilename := video.Thumbnails[0]

	// Download thumbnail from MinIO
	thumbnailObject, err := h.minioClient.DownloadThumbnail(ctx, thumbnailFilename)
	if err != nil {
		h.logger.Error("Failed to download thumbnail",
			zap.String("video_id", videoID),
			zap.String("thumbnail", thumbnailFilename),
			zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Thumbnail not found in storage"})
		return
	}
	defer thumbnailObject.Close()

	// Set appropriate headers for image response
	c.Header("Content-Type", "image/jpeg")
	c.Header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
	c.Header("Content-Disposition", "inline")

	// Stream the thumbnail
	_, err = io.Copy(c.Writer, thumbnailObject)
	if err != nil {
		h.logger.Error("Failed to stream thumbnail",
			zap.String("video_id", videoID),
			zap.Error(err))
		return
	}

	h.logger.Debug("Served thumbnail",
		zap.String("video_id", videoID),
		zap.String("thumbnail", thumbnailFilename))
}

// convertToVideoResponse converts domain entity to API response
func (h *VideoHandler) convertToVideoResponse(video *entities.Video) VideoResponse {
	formats := make([]VideoFormatResponse, len(video.Formats))
	for i, format := range video.Formats {
		formats[i] = VideoFormatResponse{
			Quality:  format.Quality,
			Filename: format.Filename,
			Size:     format.Size,
		}
	}

	// Hydrate uploader name/avatar for legacy records if missing or opaque
	uploaderName := video.UploaderName
	uploaderAvatar := video.UploaderAvatar
	if mw.IsOpaqueDisplayName(uploaderName) {
		uploaderName = ""
	}
	if uploaderName == "" {
		if !video.UploaderUserID.IsZero() {
			if u, err := h.userRepo.GetByID(context.Background(), video.UploaderUserID); err == nil && u != nil {
				uploaderName = mw.UserDisplayName(u)
				if uploaderAvatar == "" {
					uploaderAvatar = u.Avatar
				}
			}
		}
		if uploaderName == "" && video.UploadedBy != "" {
			if u, err := h.userRepo.GetBySubject(context.Background(), video.UploadedBy); err == nil && u != nil {
				uploaderName = mw.UserDisplayName(u)
				if uploaderAvatar == "" {
					uploaderAvatar = u.Avatar
				}
			}
		}
	}

	return VideoResponse{
		ID:               video.ID.Hex(),
		Title:            video.Title,
		Description:      video.Description,
		UploadedBy:       video.UploadedBy,
		UploaderName:     uploaderName,
		UploaderAvatar:   uploaderAvatar,
		OriginalFilename: video.OriginalFilename,
		Duration:         video.Duration,
		Size:             video.Size,
		Status:           string(video.Status),
		Formats:          formats,
		Thumbnails:       video.Thumbnails,
		CreatedAt:        video.CreatedAt,
		UpdatedAt:        video.UpdatedAt,
	}
}
