package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"youtube-worker/internal/processor"
	"youtube-worker/internal/queue"
	"youtube-worker/internal/storage"
	"youtube-worker/pkg/config"
	"youtube-worker/pkg/logger"

	"go.uber.org/zap"
)

type JobMessage struct {
	ID      string                 `json:"id"`
	VideoID string                 `json:"video_id"`
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
}

func main() {
	// Initialize logger
	log := logger.New()
	defer log.Sync()

	// Load configuration
	cfg := config.Load()

	// Get worker ID from environment
	workerID := os.Getenv("WORKER_ID")
	if workerID == "" {
		workerID = "worker-" + fmt.Sprintf("%d", time.Now().Unix())
	}

	log.Info("Starting video processing worker",
		zap.String("worker_id", workerID),
		zap.String("redis_uri", cfg.RedisURI),
		zap.String("mongo_uri", cfg.MongoURI),
	)

	// Initialize Redis client
	redisClient, err := queue.NewRedisClient(cfg.RedisURI)
	if err != nil {
		log.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	defer redisClient.Close()

	// Initialize MinIO client
	minioClient, err := storage.NewMinIOClient(cfg.MinIO)
	if err != nil {
		log.Fatal("Failed to connect to MinIO", zap.Error(err))
	}

	// Initialize MongoDB client for job updates
	mongoClient, err := queue.NewMongoClient(cfg.MongoURI)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB", zap.Error(err))
	}
	defer mongoClient.Close()

	// Initialize processors
	videoProcessor := processor.NewVideoProcessor(minioClient, mongoClient, log)
	moderationProcessor := processor.NewModerationProcessor(mongoClient, log, cfg.Moderation)

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start worker loop
	go func() {
		log.Info("Worker started, waiting for jobs...")

		for {
			select {
			case <-ctx.Done():
				log.Info("Worker shutting down...")
				return
			default:
				// Process jobs
				if err := processJobs(ctx, redisClient, videoProcessor, moderationProcessor, workerID, log); err != nil {
					log.Error("Error processing jobs", zap.Error(err))
					time.Sleep(5 * time.Second) // Back off on error
				}
			}
		}
	}()

	// Wait for shutdown signal
	<-sigChan
	log.Info("Received shutdown signal")
	cancel()

	// Give some time for graceful shutdown
	time.Sleep(2 * time.Second)
	log.Info("Worker stopped")
}

func processJobs(ctx context.Context, redisClient *queue.RedisClient, videoProcessor *processor.VideoProcessor, moderationProcessor *processor.ModerationProcessor, workerID string, log *zap.Logger) error {
	// Try to get a job from the queue (blocking for up to 5 seconds)
	jobData, err := redisClient.Dequeue("video_jobs", 5*time.Second)
	if err != nil {
		// No job available, continue
		return nil
	}

	if len(jobData) == 0 {
		fmt.Println("No job available, continuing...")
		return nil
	}

	fmt.Println("jobData", string(jobData))

	var job JobMessage
	if err := json.Unmarshal(jobData, &job); err != nil {
		log.Error("Failed to unmarshal job data", zap.Error(err))
		return err
	}

	log.Info("Processing job",
		zap.String("job_id", job.ID),
		zap.String("video_id", job.VideoID),
		zap.String("type", job.Type),
		zap.String("worker_id", workerID))

	// Only track start/complete in Mongo for video-processing jobs
	isTrackedJob := job.Type == "transcode" || job.Type == "thumbnail"
	if isTrackedJob {
		if err := videoProcessor.StartJob(ctx, job.ID, workerID); err != nil {
			log.Error("Failed to start job", zap.Error(err))
			return err
		}
	}

	// Process based on job type
	var processErr error
	switch job.Type {
	case "transcode":
		quality := job.Payload["quality"].(string)
		processErr = videoProcessor.TranscodeVideo(ctx, job.VideoID, job.ID, quality)
	case "thumbnail":
		processErr = videoProcessor.GenerateThumbnail(ctx, job.VideoID, job.ID)
	case "comment_moderation":
		if commentID, ok := job.Payload["comment_id"].(string); ok {
			processErr = moderationProcessor.ModerateComment(ctx, commentID)
		} else {
			processErr = fmt.Errorf("missing comment_id in payload")
		}
	default:
		processErr = fmt.Errorf("unknown job type: %s", job.Type)
	}

	// Update job status
	if processErr != nil {
		log.Error("Job processing failed",
			zap.String("job_id", job.ID),
			zap.String("type", job.Type),
			zap.Error(processErr))
		if isTrackedJob {
			return videoProcessor.FailJob(ctx, job.ID, processErr.Error())
		}
		// For non-tracked jobs (e.g., comment moderation), we already updated comment status.
		// Do not attempt to fail a non-existent DB job; just return nil.
		return nil
	}

	if isTrackedJob {
		return videoProcessor.CompleteJob(ctx, job.ID)
	}
	return nil
}
