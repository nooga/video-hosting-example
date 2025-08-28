package processor

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"youtube-worker/internal/queue"
	"youtube-worker/internal/storage"

	"go.uber.org/zap"
)

type VideoProcessor struct {
	storageClient *storage.MinIOClient
	mongoClient   *queue.MongoClient
	logger        *zap.Logger
	tempDir       string
}

func NewVideoProcessor(storageClient *storage.MinIOClient, mongoClient *queue.MongoClient, logger *zap.Logger) *VideoProcessor {
	tempDir := "/tmp/video-processing"
	os.MkdirAll(tempDir, 0755)

	return &VideoProcessor{
		storageClient: storageClient,
		mongoClient:   mongoClient,
		logger:        logger,
		tempDir:       tempDir,
	}
}

func (vp *VideoProcessor) StartJob(ctx context.Context, jobID, workerID string) error {
	return vp.mongoClient.UpdateJobStatus(ctx, jobID, "processing", workerID, 0)
}

func (vp *VideoProcessor) CompleteJob(ctx context.Context, jobID string) error {
	// Update the job status to completed
	err := vp.mongoClient.UpdateJobStatus(ctx, jobID, "completed", "", 100)
	if err != nil {
		return err
	}

	// Get the job to find the video ID
	job, err := vp.mongoClient.GetJob(ctx, jobID)
	if err != nil {
		vp.logger.Error("Failed to get job for video status check", zap.Error(err))
		return nil // Don't fail the job completion if we can't update video status
	}

	videoID := job["video_id"].(primitive.ObjectID) // Changed from string back to primitive.ObjectID

	// Check if all jobs for this video are completed
	allCompleted, err := vp.mongoClient.AreAllJobsCompleted(ctx, videoID.Hex())
	if err != nil {
		vp.logger.Error("Failed to check if all jobs completed", zap.Error(err))
		return nil // Don't fail the job completion if we can't check other jobs
	}

	// If all jobs are completed, update video status to completed
	if allCompleted {
		err = vp.mongoClient.UpdateVideoStatus(ctx, videoID.Hex(), "ready")
		if err != nil {
			vp.logger.Error("Failed to update video status to completed", zap.Error(err))
		} else {
			vp.logger.Info("Video processing completed successfully", zap.String("video_id", videoID.Hex()))
		}
	}

	return nil
}

func (vp *VideoProcessor) FailJob(ctx context.Context, jobID, errorMessage string) error {
	return vp.mongoClient.FailJob(ctx, jobID, errorMessage)
}

func (vp *VideoProcessor) TranscodeVideo(ctx context.Context, videoID, jobID, quality string) error {
	vp.logger.Info("Starting video transcoding",
		zap.String("video_id", videoID),
		zap.String("quality", quality))
	time.Sleep(5 * time.Second)

	// Get video info from database
	video, err := vp.mongoClient.GetVideo(ctx, videoID)
	if err != nil {
		return fmt.Errorf("failed to get video info: %w", err)
	}

	originalFilename := video["original_filename"].(string)
	ext := filepath.Ext(originalFilename)

	// Define input and output paths
	inputPath := "videos/original/" + videoID + ext
	outputFilename := videoID + "_" + quality + ".mp4"
	outputPath := "videos/processed/" + outputFilename

	// Local temporary file paths
	localInputPath := filepath.Join(vp.tempDir, "input_"+videoID+ext)
	localOutputPath := filepath.Join(vp.tempDir, "output_"+outputFilename)

	// Clean up temporary files
	defer func() {
		os.Remove(localInputPath)
		os.Remove(localOutputPath)
	}()

	// Update progress: Downloading
	vp.mongoClient.UpdateJobStatus(ctx, jobID, "processing", "", 10)

	// Download original video from MinIO
	vp.logger.Info("Downloading original video", zap.String("input_path", inputPath))

	inputObject, err := vp.storageClient.DownloadFile(ctx, inputPath)
	if err != nil {
		return fmt.Errorf("failed to download original video: %w", err)
	}
	defer inputObject.Close()

	// Save to local temporary file
	inputFile, err := os.Create(localInputPath)
	if err != nil {
		return fmt.Errorf("failed to create temp input file: %w", err)
	}
	defer inputFile.Close()

	_, err = inputFile.ReadFrom(inputObject)
	if err != nil {
		return fmt.Errorf("failed to save input file: %w", err)
	}

	// Update progress: Processing
	vp.mongoClient.UpdateJobStatus(ctx, jobID, "processing", "", 30)

	// Transcode video using FFmpeg
	vp.logger.Info("Starting FFmpeg transcoding", zap.String("quality", quality))

	ffmpegArgs := vp.buildFFmpegArgs(localInputPath, localOutputPath, quality)

	cmd := exec.CommandContext(ctx, "ffmpeg", ffmpegArgs...)
	cmd.Stderr = os.Stderr // For debugging

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg transcoding failed: %w", err)
	}

	// Update progress: Uploading
	vp.mongoClient.UpdateJobStatus(ctx, jobID, "processing", "", 80)

	// Upload processed video to MinIO
	vp.logger.Info("Uploading processed video", zap.String("output_path", outputPath))

	outputFile, err := os.Open(localOutputPath)
	if err != nil {
		return fmt.Errorf("failed to open processed video: %w", err)
	}
	defer outputFile.Close()

	fileInfo, err := outputFile.Stat()
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}

	err = vp.storageClient.UploadFile(ctx, outputPath, outputFile, fileInfo.Size(), "video/mp4")
	if err != nil {
		return fmt.Errorf("failed to upload processed video: %w", err)
	}

	// Update video record with new format
	err = vp.mongoClient.AddVideoFormat(ctx, videoID, quality, outputFilename, fileInfo.Size())
	if err != nil {
		return fmt.Errorf("failed to update video record: %w", err)
	}

	vp.logger.Info("Video transcoding completed",
		zap.String("video_id", videoID),
		zap.String("quality", quality),
		zap.Int64("size", fileInfo.Size()))

	return nil
}

func (vp *VideoProcessor) buildFFmpegArgs(inputPath, outputPath, quality string) []string {
	args := []string{
		"-i", inputPath,
		"-c:v", "libx264",
		"-preset", "medium",
		"-crf", "23",
		"-c:a", "aac",
		"-b:a", "128k",
		"-movflags", "+faststart",
		"-y", // Overwrite output file
	}

	// Add quality-specific settings
	switch quality {
	case "480p":
		args = append(args, "-vf", "scale=-2:480", "-maxrate", "1M", "-bufsize", "2M")
	case "720p":
		args = append(args, "-vf", "scale=-2:720", "-maxrate", "2.5M", "-bufsize", "5M")
	case "1080p":
		args = append(args, "-vf", "scale=-2:720", "-maxrate", "2.5M", "-bufsize", "5M")
	default:
		// Default to 720p
		args = append(args, "-vf", "scale=-2:720", "-maxrate", "2.5M", "-bufsize", "5M")
	}

	args = append(args, outputPath)
	return args
}

func (vp *VideoProcessor) GenerateThumbnail(ctx context.Context, videoID, jobID string) error {
	vp.logger.Info("Starting thumbnail generation", zap.String("video_id", videoID))
	time.Sleep(5 * time.Second)

	// Get video info from database
	video, err := vp.mongoClient.GetVideo(ctx, videoID)
	if err != nil {
		return fmt.Errorf("failed to get video info: %w", err)
	}

	originalFilename := video["original_filename"].(string)
	ext := filepath.Ext(originalFilename)

	// Define paths
	inputPath := "videos/original/" + videoID + ext
	thumbnailFilename := videoID + "_thumb.jpg"
	// Note: thumbnailFilename is used directly as object name in thumbnails bucket

	// Local temporary file paths
	localInputPath := filepath.Join(vp.tempDir, "thumb_input_"+videoID+ext)
	localThumbnailPath := filepath.Join(vp.tempDir, "thumb_"+thumbnailFilename)

	// Clean up temporary files
	defer func() {
		os.Remove(localInputPath)
		os.Remove(localThumbnailPath)
	}()

	fmt.Println("inputPath", inputPath)

	// Update progress: Downloading
	vp.mongoClient.UpdateJobStatus(ctx, jobID, "processing", "", 20)

	// Download original video
	inputObject, err := vp.storageClient.DownloadFile(ctx, inputPath)
	if err != nil {
		return fmt.Errorf("failed to download original video: %w", err)
	}
	defer inputObject.Close()

	// Save to local temporary file
	inputFile, err := os.Create(localInputPath)
	if err != nil {
		return fmt.Errorf("failed to create temp input file: %w", err)
	}
	defer inputFile.Close()

	_, err = inputFile.ReadFrom(inputObject)
	if err != nil {
		return fmt.Errorf("failed to save input file: %w", err)
	}

	// Update progress: Processing
	vp.mongoClient.UpdateJobStatus(ctx, jobID, "processing", "", 50)

	// Generate thumbnail using FFmpeg
	vp.logger.Info("Generating thumbnail with FFmpeg")

	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-i", localInputPath,
		"-vf", "thumbnail,scale=320:240",
		"-frames:v", "1",
		"-q:v", "2",
		"-y",
		localThumbnailPath,
	)

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("thumbnail generation failed: %w", err)
	}

	// Update progress: Uploading
	vp.mongoClient.UpdateJobStatus(ctx, jobID, "processing", "", 80)

	// Upload thumbnail to MinIO
	thumbnailFile, err := os.Open(localThumbnailPath)
	if err != nil {
		return fmt.Errorf("failed to open thumbnail: %w", err)
	}
	defer thumbnailFile.Close()

	fileInfo, err := thumbnailFile.Stat()
	if err != nil {
		return fmt.Errorf("failed to get thumbnail info: %w", err)
	}

	err = vp.storageClient.UploadThumbnail(ctx, thumbnailFilename, thumbnailFile, fileInfo.Size(), "image/jpeg")
	if err != nil {
		return fmt.Errorf("failed to upload thumbnail: %w", err)
	}

	// Update video record with thumbnail
	err = vp.mongoClient.AddVideoThumbnail(ctx, videoID, thumbnailFilename)
	if err != nil {
		return fmt.Errorf("failed to update video record: %w", err)
	}

	vp.logger.Info("Thumbnail generation completed",
		zap.String("video_id", videoID),
		zap.String("thumbnail", thumbnailFilename))

	return nil
}
