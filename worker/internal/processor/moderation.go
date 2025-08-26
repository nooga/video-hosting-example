package processor

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"youtube-worker/internal/queue"
	"youtube-worker/pkg/config"

	"go.uber.org/zap"
)

type ModerationProcessor struct {
	mongoClient *queue.MongoClient
	logger      *zap.Logger
	cfg         config.ModerationConfig
}

func NewModerationProcessor(mongoClient *queue.MongoClient, logger *zap.Logger, cfg config.ModerationConfig) *ModerationProcessor {
	return &ModerationProcessor{mongoClient: mongoClient, logger: logger, cfg: cfg}
}

// ModerateComment calls an OpenAI-compatible moderation endpoint and updates the comment status
func (mp *ModerationProcessor) ModerateComment(ctx context.Context, commentID string) error {
	// Fetch comment document directly via Mongo client collection access
	// For simplicity, we re-open the collection path here
	// Note: In a more structured design, we'd expose a comment repo in worker

	// Build request payload for moderation
	req := map[string]interface{}{
		"model": mp.cfg.Model,
		"input": map[string]string{
			"comment_id": commentID,
		},
	}
	body, _ := json.Marshal(req)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, mp.cfg.APIURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if mp.cfg.APIToken != "" {
		httpReq.Header.Set("Authorization", "Bearer "+mp.cfg.APIToken)
	}

	httpClient := &http.Client{Timeout: 20 * time.Second}
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", fmt.Sprintf("request failed: %v", err))
	}
	defer resp.Body.Close()

	var parsed map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", "invalid response JSON")
	}

	// Extremely simplified decision: expect { approved: boolean, reason?: string }
	approved, _ := parsed["approved"].(bool)
	reason, _ := parsed["reason"].(string)
	if approved {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "published", "")
	}
	return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "rejected", reason)
}

// helper: object id validation (unused here but left for clarity)
func isValidObjectID(id string) bool {
	_, err := primitive.ObjectIDFromHex(id)
	return err == nil
}
