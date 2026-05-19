package repositories

import (
	"context"
	"fmt"
	"time"

	"youtube-backend/internal/domain/entities"
	"youtube-backend/internal/domain/repositories"
	"youtube-backend/internal/infrastructure/database"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CommentRepositoryImpl struct {
	collection *mongo.Collection
}

func NewCommentRepository(db *database.MongoDB) repositories.CommentRepository {
	return &CommentRepositoryImpl{collection: db.GetCollection("comments")}
}

func (r *CommentRepositoryImpl) Create(ctx context.Context, comment *entities.Comment) error {
	_, err := r.collection.InsertOne(ctx, comment)
	if err != nil {
		return fmt.Errorf("failed to create comment: %w", err)
	}
	return nil
}

func (r *CommentRepositoryImpl) GetByID(ctx context.Context, id primitive.ObjectID) (*entities.Comment, error) {
	var c entities.Comment
	if err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&c); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("comment not found")
		}
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}
	return &c, nil
}

func (r *CommentRepositoryImpl) ListByVideo(ctx context.Context, videoID primitive.ObjectID, authorSubject string, includePendingForAuthor bool, limit, offset int) ([]*entities.Comment, error) {
	filter := bson.M{"video_id": videoID}
	// Only published are visible to everyone; authenticated authors also see their own comments in any status.
	if includePendingForAuthor && authorSubject != "" {
		filter["$or"] = []bson.M{
			{"status": entities.CommentStatusPublished},
			{"author_subject": authorSubject},
		}
	} else {
		filter["status"] = entities.CommentStatusPublished
	}

	findOpts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))

	cursor, err := r.collection.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to list comments: %w", err)
	}
	defer cursor.Close(ctx)

	var comments []*entities.Comment
	for cursor.Next(ctx) {
		var c entities.Comment
		if err := cursor.Decode(&c); err != nil {
			return nil, fmt.Errorf("failed to decode comment: %w", err)
		}
		comments = append(comments, &c)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}
	return comments, nil
}

func (r *CommentRepositoryImpl) UpdateStatus(ctx context.Context, id primitive.ObjectID, status entities.CommentStatus, reason string) error {
	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"reason":     reason,
			"updated_at": time.Now(),
		},
	}
	res, err := r.collection.UpdateByID(ctx, id, update)
	if err != nil {
		return fmt.Errorf("failed to update comment status: %w", err)
	}
	if res.MatchedCount == 0 {
		return fmt.Errorf("comment not found")
	}
	return nil
}
