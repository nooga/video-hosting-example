package services

import (
	"context"
	"fmt"

	"youtube-backend/internal/domain/entities"
	"youtube-backend/internal/domain/repositories"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CommentService struct {
	repo repositories.CommentRepository
}

func NewCommentService(repo repositories.CommentRepository) *CommentService {
	return &CommentService{repo: repo}
}

func (s *CommentService) CreatePending(ctx context.Context, videoID primitive.ObjectID, authorID, content string) (*entities.Comment, error) {
	if content == "" {
		return nil, fmt.Errorf("content is required")
	}
	comment := entities.NewComment(videoID, authorID, content)
	if err := s.repo.Create(ctx, comment); err != nil {
		return nil, err
	}
	return comment, nil
}

func (s *CommentService) Publish(ctx context.Context, id primitive.ObjectID) error {
	return s.repo.UpdateStatus(ctx, id, entities.CommentStatusPublished, "")
}

func (s *CommentService) Reject(ctx context.Context, id primitive.ObjectID, reason string) error {
	return s.repo.UpdateStatus(ctx, id, entities.CommentStatusRejected, reason)
}

func (s *CommentService) Error(ctx context.Context, id primitive.ObjectID, reason string) error {
	return s.repo.UpdateStatus(ctx, id, entities.CommentStatusError, reason)
}

func (s *CommentService) ListForVideo(ctx context.Context, videoID primitive.ObjectID, authorID string, includePendingForAuthor bool, limit, offset int) ([]*entities.Comment, error) {
	return s.repo.ListByVideo(ctx, videoID, authorID, includePendingForAuthor, limit, offset)
}

func (s *CommentService) GetByID(ctx context.Context, id primitive.ObjectID) (*entities.Comment, error) {
	return s.repo.GetByID(ctx, id)
}
