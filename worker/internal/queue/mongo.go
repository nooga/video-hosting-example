package queue

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoClient struct {
	client             *mongo.Client
	database           *mongo.Database
	jobsCollection     *mongo.Collection
	videosCollection   *mongo.Collection
	commentsCollection *mongo.Collection
}

func NewMongoClient(uri string) (*MongoClient, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	// Ping the database to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	database := client.Database("youtube")

	return &MongoClient{
		client:             client,
		database:           database,
		jobsCollection:     database.Collection("jobs"),
		videosCollection:   database.Collection("videos"),
		commentsCollection: database.Collection("comments"),
	}, nil
}

func (m *MongoClient) Close() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return m.client.Disconnect(ctx)
}

func (m *MongoClient) UpdateJobStatus(ctx context.Context, jobID, status, workerID string, progress int) error {
	objID, err := primitive.ObjectIDFromHex(jobID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"progress":   progress,
			"updated_at": time.Now(),
		},
	}

	if workerID != "" {
		update["$set"].(bson.M)["worker_id"] = workerID
	}

	if status == "processing" {
		update["$set"].(bson.M)["started_at"] = time.Now()
	} else if status == "completed" || status == "failed" {
		update["$set"].(bson.M)["completed_at"] = time.Now()
	}

	_, err = m.jobsCollection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

func (m *MongoClient) FailJob(ctx context.Context, jobID, errorMessage string) error {
	objID, err := primitive.ObjectIDFromHex(jobID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"status":        "failed",
			"error_message": errorMessage,
			"completed_at":  time.Now(),
			"updated_at":    time.Now(),
		},
	}

	_, err = m.jobsCollection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

func (m *MongoClient) AddVideoFormat(ctx context.Context, videoID, quality, filename string, size int64) error {
	objID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		return err
	}

	format := bson.M{
		"quality":  quality,
		"filename": filename,
		"size":     size,
	}

	update := bson.M{
		"$push": bson.M{"formats": format},
		"$set":  bson.M{"updated_at": time.Now()},
	}

	_, err = m.videosCollection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

func (m *MongoClient) AddVideoThumbnail(ctx context.Context, videoID, filename string) error {
	objID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$push": bson.M{"thumbnails": filename},
		"$set":  bson.M{"updated_at": time.Now()},
	}

	_, err = m.videosCollection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

func (m *MongoClient) GetVideo(ctx context.Context, videoID string) (bson.M, error) {
	objID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		return nil, err
	}

	var video bson.M
	err = m.videosCollection.FindOne(ctx, bson.M{"_id": objID}).Decode(&video)
	return video, err
}

func (m *MongoClient) UpdateVideoStatus(ctx context.Context, videoID, status string) error {
	objID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		},
	}

	_, err = m.videosCollection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

// GetJob retrieves a job by ID
func (m *MongoClient) GetJob(ctx context.Context, jobID string) (bson.M, error) {
	objID, err := primitive.ObjectIDFromHex(jobID)
	if err != nil {
		return nil, err
	}

	var job bson.M
	err = m.jobsCollection.FindOne(ctx, bson.M{"_id": objID}).Decode(&job)
	return job, err
}

// AreAllJobsCompleted checks if all jobs for a video are completed
func (m *MongoClient) AreAllJobsCompleted(ctx context.Context, videoID string) (bool, error) {
	objID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		return false, err
	}

	// Count total jobs for this video
	totalJobs, err := m.jobsCollection.CountDocuments(ctx, bson.M{"video_id": objID})
	if err != nil {
		return false, err
	}

	// Count completed jobs for this video
	completedJobs, err := m.jobsCollection.CountDocuments(ctx, bson.M{
		"video_id": objID,
		"status":   "completed",
	})
	if err != nil {
		return false, err
	}

	// All jobs are completed if counts match and there's at least one job
	return totalJobs > 0 && totalJobs == completedJobs, nil
}

// UpdateCommentStatus updates moderation status for a comment by string ID
func (m *MongoClient) UpdateCommentStatus(ctx context.Context, commentID, status, reason string) error {
	objID, err := primitive.ObjectIDFromHex(commentID)
	if err != nil {
		return err
	}
	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"reason":     reason,
			"updated_at": time.Now(),
		},
	}
	_, err = m.commentsCollection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}
