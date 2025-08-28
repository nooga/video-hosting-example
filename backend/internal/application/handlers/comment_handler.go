package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"youtube-backend/internal/domain/entities"
	"youtube-backend/internal/domain/services"
	"youtube-backend/internal/infrastructure/queue"
	mw "youtube-backend/internal/interfaces/middleware"
	"youtube-backend/pkg/config"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.uber.org/zap"
)

type CommentHandler struct {
	service      *services.CommentService
	jobPublisher *queue.JobPublisher
	moderation   config.ModerationConfig
	logger       *zap.Logger
}

type CreateCommentRequest struct {
	Content      string `json:"content" binding:"required"`
	AuthorName   string `json:"author_name"`
	AuthorAvatar string `json:"author_avatar"`
}

type CommentResponse struct {
	ID           string                 `json:"id"`
	VideoID      string                 `json:"video_id"`
	AuthorID     string                 `json:"author_id"`
	AuthorName   string                 `json:"author_name"`
	AuthorAvatar string                 `json:"author_avatar"`
	Content      string                 `json:"content"`
	Status       entities.CommentStatus `json:"status"`
	Reason       string                 `json:"reason,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

type CommentListResponse struct {
	Comments []CommentResponse `json:"comments"`
	Page     int               `json:"page"`
	Limit    int               `json:"limit"`
}

func NewCommentHandler(service *services.CommentService, jobPublisher *queue.JobPublisher, moderation config.ModerationConfig, logger *zap.Logger) *CommentHandler {
	return &CommentHandler{service: service, jobPublisher: jobPublisher, moderation: moderation, logger: logger}
}

func (h *CommentHandler) Create(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	videoID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid video id"})
		return
	}

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	authSub := mw.GetAuthSubject(c)
	if authSub == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	authorOID := mw.GetAuthUserID(c)
	if authorOID == primitive.NilObjectID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	authorName := mw.GetAuthName(c)
	authorAvatar := mw.GetAuthPicture(c)
	if authorName == "" {
		authorName = req.AuthorName
	}
	if authorAvatar == "" {
		authorAvatar = req.AuthorAvatar
	}
	comment, err := h.service.CreatePending(ctx, objID, authorOID, authSub, authorName, authorAvatar, req.Content)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Set denormalized subject for filtering pending on list
	comment.AuthorSubject = authSub

	// Always enqueue moderation job; worker decides whether to moderate or pass-through
	if err := h.jobPublisher.PublishCommentModeration(ctx, comment.ID, objID); err != nil {
		h.logger.Error("failed to enqueue moderation job", zap.Error(err))
	}
	resp := h.toResponse(comment)
	c.JSON(http.StatusCreated, resp)
}

func (h *CommentHandler) List(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	videoID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(videoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid video id"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	includePendingForAuthor := false
	authorSub := mw.GetAuthSubject(c)
	if authorSub != "" {
		includePendingForAuthor = true
	}

	comments, err := h.service.ListForVideo(ctx, objID, authorSub, includePendingForAuthor, limit, (page-1)*limit)
	if err != nil {
		h.logger.Error("failed to list comments", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list comments"})
		return
	}
	resp := make([]CommentResponse, 0, len(comments))
	for _, cm := range comments {
		resp = append(resp, h.toResponse(cm))
	}
	c.JSON(http.StatusOK, CommentListResponse{Comments: resp, Page: page, Limit: limit})
}

func (h *CommentHandler) toResponse(cmt *entities.Comment) CommentResponse {
	return CommentResponse{
		ID:           cmt.ID.Hex(),
		VideoID:      cmt.VideoID.Hex(),
		AuthorID:     cmt.AuthorID.Hex(),
		AuthorName:   cmt.AuthorName,
		AuthorAvatar: cmt.AuthorAvatar,
		Content:      cmt.Content,
		Status:       cmt.Status,
		Reason:       cmt.Reason,
		CreatedAt:    cmt.CreatedAt,
		UpdatedAt:    cmt.UpdatedAt,
	}
}
