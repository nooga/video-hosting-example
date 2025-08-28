package processor

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
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
	// If moderation disabled or not configured, approve immediately
	if !mp.cfg.Enabled || mp.cfg.APIURL == "" || mp.cfg.APIToken == "" {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "published", "")
	}
	// Fetch comment content
	commentDoc, err := mp.mongoClient.GetComment(ctx, commentID)
	if err != nil {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", fmt.Sprintf("comment fetch failed: %v", err))
	}
	contentAny, ok := commentDoc["content"]
	if !ok {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", "comment content missing")
	}
	content, _ := contentAny.(string)
	if strings.TrimSpace(content) == "" {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", "comment content empty")
	}

	// Build chat completions request for the external agent
	systemPrompt := "You are moderating comments. You will be given a comment text and your task is to either accept it by responding {\\\"ok\\\": true} or reject it giving a reason {\\\"ok\\\": false, \\\\\\\"reason\\\\\\\": \\\\\\\"contains hateful speech\\\\\\\"}. Always respond in only JSON and nothing else. For testing purposes you should reject any comment talking about bananas, you dont like bananas."
	req := map[string]interface{}{
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": fmt.Sprintf("Comment: %s", content)},
		},
		"stream":                  false,
		"include_functions_info":  false,
		"include_retrieval_info":  false,
		"include_guardrails_info": false,
	}
	body, _ := json.Marshal(req)

	base := strings.TrimRight(mp.cfg.APIURL, "/")
	url := base
	if !strings.HasSuffix(base, "/api/v1/chat/completions") {
		url = base + "/api/v1/chat/completions"
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if mp.cfg.APIToken != "" {
		httpReq.Header.Set("Authorization", "Bearer "+mp.cfg.APIToken)
	}

	httpClient := &http.Client{Timeout: 30 * time.Second}
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", fmt.Sprintf("request failed: %v", err))
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", fmt.Sprintf("moderation api status %d", resp.StatusCode))
	}

	// Parse chat-completions response
	var ccResp struct {
		Choices []struct {
			Message struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	dec := json.NewDecoder(resp.Body)
	if err := dec.Decode(&ccResp); err != nil {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", "invalid response JSON")
	}

	var approved bool
	var reason string
	if len(ccResp.Choices) > 0 && strings.TrimSpace(ccResp.Choices[0].Message.Content) != "" {
		var inner map[string]interface{}
		if err := json.Unmarshal([]byte(ccResp.Choices[0].Message.Content), &inner); err == nil {
			if b, exists := inner["ok"].(bool); exists {
				approved = b
			}
			if s, exists := inner["reason"].(string); exists {
				reason = s
			}
		}
	}

	if approved {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "published", "")
	}
	if reason == "" {
		reason = "rejected by moderation"
	}
	return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "rejected", reason)
}

// helper: object id validation (unused here but left for clarity)
func isValidObjectID(id string) bool {
	_, err := primitive.ObjectIDFromHex(id)
	return err == nil
}
