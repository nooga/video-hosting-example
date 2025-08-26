package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CommentStatus string

const (
	CommentStatusPending   CommentStatus = "pending"
	CommentStatusPublished CommentStatus = "published"
	CommentStatusRejected  CommentStatus = "rejected"
	CommentStatusError     CommentStatus = "error"
)

type Comment struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	VideoID   primitive.ObjectID `json:"video_id" bson:"video_id"`
	AuthorID  string             `json:"author_id" bson:"author_id"`
	Content   string             `json:"content" bson:"content"`
	Status    CommentStatus      `json:"status" bson:"status"`
	Reason    string             `json:"reason,omitempty" bson:"reason,omitempty"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

func NewComment(videoID primitive.ObjectID, authorID, content string) *Comment {
	now := time.Now()
	return &Comment{
		ID:        primitive.NewObjectID(),
		VideoID:   videoID,
		AuthorID:  authorID,
		Content:   content,
		Status:    CommentStatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
}
