package services

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"youtube-backend/internal/domain/entities"
	"youtube-backend/internal/domain/repositories"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VideoService struct {
	videoRepo    repositories.VideoRepository
	jobRepo      repositories.JobRepository
	jobPublisher JobPublisher
}

type JobPublisher interface {
	PublishTranscodeJob(ctx context.Context, videoID primitive.ObjectID, jobID primitive.ObjectID, quality string) error
	PublishThumbnailJob(ctx context.Context, videoID primitive.ObjectID, jobID primitive.ObjectID) error
}

func NewVideoService(videoRepo repositories.VideoRepository, jobRepo repositories.JobRepository, jobPublisher JobPublisher) *VideoService {
	return &VideoService{
		videoRepo:    videoRepo,
		jobRepo:      jobRepo,
		jobPublisher: jobPublisher,
	}
}

// CreateVideo creates a new video and schedules processing jobs
func (s *VideoService) CreateVideo(ctx context.Context, title, description, uploadedBy, uploaderName, uploaderAvatar, originalFilename string, size int64, opts ...primitive.ObjectID) (*entities.Video, error) {
	// Validate input
	if err := s.validateVideoInput(title, originalFilename, size); err != nil {
		return nil, err
	}

	var uploaderOID primitive.ObjectID
	if len(opts) > 0 {
		uploaderOID = opts[0]
	}

	// Create video entity
	video := entities.NewVideo(uploaderOID, title, description, uploadedBy, uploaderName, uploaderAvatar, originalFilename, size)

	// Save to repository
	if err := s.videoRepo.Create(ctx, video); err != nil {
		return nil, fmt.Errorf("failed to create video: %w", err)
	}

	return video, nil
}

// GetVideo retrieves a video by ID
func (s *VideoService) GetVideo(ctx context.Context, id primitive.ObjectID) (*entities.Video, error) {
	return s.videoRepo.GetByID(ctx, id)
}

// UpdateVideoStatus updates the video status
func (s *VideoService) UpdateVideoStatus(ctx context.Context, id primitive.ObjectID, status entities.VideoStatus) error {
	video, err := s.videoRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get video: %w", err)
	}

	video.UpdateStatus(status)
	return s.videoRepo.Update(ctx, video)
}

// AddVideoFormat adds a new format to a video
func (s *VideoService) AddVideoFormat(ctx context.Context, videoID primitive.ObjectID, quality, filename string, size int64) error {
	video, err := s.videoRepo.GetByID(ctx, videoID)
	if err != nil {
		return fmt.Errorf("failed to get video: %w", err)
	}

	video.AddFormat(quality, filename, size)
	return s.videoRepo.Update(ctx, video)
}

// AddVideoThumbnail adds a thumbnail to a video
func (s *VideoService) AddVideoThumbnail(ctx context.Context, videoID primitive.ObjectID, filename string) error {
	video, err := s.videoRepo.GetByID(ctx, videoID)
	if err != nil {
		return fmt.Errorf("failed to get video: %w", err)
	}

	video.AddThumbnail(filename)
	return s.videoRepo.Update(ctx, video)
}

// ListVideos retrieves a paginated list of videos
func (s *VideoService) ListVideos(ctx context.Context, limit, offset int) ([]*entities.Video, error) {
	return s.videoRepo.List(ctx, limit, offset)
}

// SearchVideos searches for videos by title or description
func (s *VideoService) SearchVideos(ctx context.Context, query string, limit, offset int) ([]*entities.Video, error) {
	return s.videoRepo.Search(ctx, query, limit, offset)
}

// ScheduleProcessingJobs creates processing jobs for a video and publishes them to the queue
func (s *VideoService) ScheduleProcessingJobs(ctx context.Context, videoID primitive.ObjectID) error {
	// Update video status to processing
	if err := s.UpdateVideoStatus(ctx, videoID, entities.VideoStatusProcessing); err != nil {
		return fmt.Errorf("failed to update video status: %w", err)
	}

	// Schedule thumbnail generation job
	thumbnailJob := entities.NewJob(videoID, entities.JobTypeThumbnail, map[string]any{
		"video_id": videoID.Hex(),
	})
	if err := s.jobRepo.Create(ctx, thumbnailJob); err != nil {
		return fmt.Errorf("failed to create thumbnail job: %w", err)
	}

	// Publish thumbnail job to queue
	if err := s.jobPublisher.PublishThumbnailJob(ctx, videoID, thumbnailJob.ID); err != nil {
		return fmt.Errorf("failed to publish thumbnail job: %w", err)
	}

	// Schedule transcoding jobs for different qualities
	qualities := []string{"480p", "720p", "1080p"}
	for _, quality := range qualities {
		transcodeJob := entities.NewJob(videoID, entities.JobTypeTranscode, map[string]any{
			"video_id": videoID.Hex(),
			"quality":  quality,
		})
		if err := s.jobRepo.Create(ctx, transcodeJob); err != nil {
			return fmt.Errorf("failed to create transcode job for %s: %w", quality, err)
		}

		// Publish transcode job to queue
		if err := s.jobPublisher.PublishTranscodeJob(ctx, videoID, transcodeJob.ID, quality); err != nil {
			return fmt.Errorf("failed to publish transcode job for %s: %w", quality, err)
		}
	}

	return nil
}

// validateVideoInput validates video input parameters
func (s *VideoService) validateVideoInput(title, filename string, size int64) error {
	if strings.TrimSpace(title) == "" {
		return fmt.Errorf("title cannot be empty")
	}

	if strings.TrimSpace(filename) == "" {
		return fmt.Errorf("filename cannot be empty")
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(filename))
	allowedExts := []string{".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv"}
	isAllowed := false
	for _, allowedExt := range allowedExts {
		if ext == allowedExt {
			isAllowed = true
			break
		}
	}
	if !isAllowed {
		return fmt.Errorf("unsupported file format: %s", ext)
	}

	// Check file size (max 1GB for example)
	maxSize := int64(1024 * 1024 * 1024) // 1GB
	if size > maxSize {
		return fmt.Errorf("file size too large: %d bytes (max: %d bytes)", size, maxSize)
	}

	if size <= 0 {
		return fmt.Errorf("invalid file size: %d", size)
	}

	return nil
}
