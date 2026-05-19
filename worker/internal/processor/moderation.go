package processor

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

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

func (mp *ModerationProcessor) ModerateComment(ctx context.Context, commentID string) error {
	if !mp.cfg.Enabled || mp.cfg.APIURL == "" || mp.cfg.APIToken == "" {
		mp.logger.Info("moderation disabled or not configured, auto-publishing comment", zap.String("comment_id", commentID))
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "published", "")
	}

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

	systemPrompt := `You moderate comments for a video hosting platform.
Return strict JSON only: {"ok": true|false, "category": "...", "reason": "...", "confidence": 0.0-1.0}
Set ok to true only when the comment is safe to publish. No markdown or extra text.`

	reqBody := map[string]interface{}{
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": content},
		},
		"stream": false,
	}
	if mp.cfg.Model != "" {
		reqBody["model"] = mp.cfg.Model
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", "failed to encode moderation request")
	}

	url := chatCompletionsURL(mp.cfg.APIURL)
	mp.logger.Info("calling moderation API", zap.String("comment_id", commentID), zap.String("url", url))

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	token := strings.TrimSpace(mp.cfg.APIToken)
	httpReq.Header.Set("Authorization", "Bearer "+token)

	resp, err := (&http.Client{Timeout: 45 * time.Second}).Do(httpReq)
	if err != nil {
		mp.logger.Error("moderation request failed", zap.String("comment_id", commentID), zap.Error(err))
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", fmt.Sprintf("request failed: %v", err))
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", "failed to read moderation response")
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		mp.logger.Error("moderation API error",
			zap.String("comment_id", commentID),
			zap.Int("status", resp.StatusCode),
			zap.String("body", truncate(string(respBody), 500)),
		)
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", fmt.Sprintf("moderation api status %d", resp.StatusCode))
	}

	var ccResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &ccResp); err != nil {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", "invalid response JSON")
	}

	if len(ccResp.Choices) == 0 || strings.TrimSpace(ccResp.Choices[0].Message.Content) == "" {
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", "empty moderation response")
	}

	rawContent := ccResp.Choices[0].Message.Content
	approved, reason, err := parseModerationDecision(rawContent)
	if err != nil {
		mp.logger.Error("failed to parse moderation decision",
			zap.String("comment_id", commentID),
			zap.String("content", truncate(rawContent, 500)),
			zap.Error(err),
		)
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "error", "invalid moderation decision JSON")
	}

	if approved {
		mp.logger.Info("comment approved by moderation", zap.String("comment_id", commentID))
		return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "published", "")
	}

	if reason == "" {
		reason = "rejected by moderation"
	}
	mp.logger.Info("comment rejected by moderation", zap.String("comment_id", commentID), zap.String("reason", reason))
	return mp.mongoClient.UpdateCommentStatus(ctx, commentID, "rejected", reason)
}

func chatCompletionsURL(base string) string {
	base = strings.TrimRight(base, "/")
	var url string
	switch {
	case strings.Contains(base, "/chat/completions"):
		url = base
	case strings.HasSuffix(base, "/v1"):
		url = base + "/chat/completions"
	default:
		url = base + "/api/v1/chat/completions"
	}
	if !strings.Contains(url, "agent=") {
		if strings.Contains(url, "?") {
			url += "&agent=true"
		} else {
			url += "?agent=true"
		}
	}
	return url
}

func parseModerationDecision(content string) (approved bool, reason string, err error) {
	jsonStr := extractJSONObject(content)
	if jsonStr == "" {
		return false, "", fmt.Errorf("no JSON object in response")
	}

	var decision map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &decision); err != nil {
		return false, "", err
	}

	okVal, exists := decision["ok"]
	if !exists {
		return false, "", fmt.Errorf("missing ok field")
	}

	switch v := okVal.(type) {
	case bool:
		approved = v
	default:
		return false, "", fmt.Errorf("ok field is not boolean")
	}

	if s, ok := decision["reason"].(string); ok {
		reason = s
	}
	return approved, reason, nil
}

func extractJSONObject(s string) string {
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start >= 0 && end > start {
		return s[start : end+1]
	}
	return ""
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
