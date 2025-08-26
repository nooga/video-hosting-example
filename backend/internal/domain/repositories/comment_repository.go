package repositories

import (
	"context"

	"youtube-backend/internal/domain/entities"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CommentRepository interface {
	Create(ctx context.Context, comment *entities.Comment) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*entities.Comment, error)
	ListByVideo(ctx context.Context, videoID primitive.ObjectID, authorID string, includePendingForAuthor bool, limit, offset int) ([]*entities.Comment, error)
	UpdateStatus(ctx context.Context, id primitive.ObjectID, status entities.CommentStatus, reason string) error
}
