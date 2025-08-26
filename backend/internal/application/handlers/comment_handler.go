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
	Content string `json:"content" binding:"required"`
}

type CommentResponse struct {
	ID        string                 `json:"id"`
	VideoID   string                 `json:"video_id"`
	AuthorID  string                 `json:"author_id"`
	Content   string                 `json:"content"`
	Status    entities.CommentStatus `json:"status"`
	Reason    string                 `json:"reason,omitempty"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
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

	authorID := mw.GetAuthSubject(c)
	if authorID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	comment, err := h.service.CreatePending(ctx, objID, authorID, req.Content)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// If moderation configured, enqueue moderation job; otherwise publish immediately
	if h.moderation.Enabled && h.moderation.APIURL != "" && h.moderation.APIToken != "" {
		if err := h.jobPublisher.PublishCommentModeration(ctx, comment.ID, objID); err != nil {
			h.logger.Error("failed to enqueue moderation job", zap.Error(err))
		}
		resp := h.toResponse(comment)
		c.JSON(http.StatusCreated, resp)
		return
	}

	if err := h.service.Publish(ctx, comment.ID); err != nil {
		h.logger.Error("failed to publish comment without moderation", zap.Error(err))
	}
	published, _ := h.service.GetByID(ctx, comment.ID)
	resp := h.toResponse(published)
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
	authorID := mw.GetAuthSubject(c)
	if authorID != "" {
		includePendingForAuthor = true
	}

	comments, err := h.service.ListForVideo(ctx, objID, authorID, includePendingForAuthor, limit, (page-1)*limit)
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
		ID:        cmt.ID.Hex(),
		VideoID:   cmt.VideoID.Hex(),
		AuthorID:  cmt.AuthorID,
		Content:   cmt.Content,
		Status:    cmt.Status,
		Reason:    cmt.Reason,
		CreatedAt: cmt.CreatedAt,
		UpdatedAt: cmt.UpdatedAt,
	}
}
