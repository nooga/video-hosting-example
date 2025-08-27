package middleware

import (
	"context"
	"strings"
	"time"

	"youtube-backend/internal/domain/entities"
	"youtube-backend/internal/domain/repositories"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// context keys
const (
	contextUserKey   = "auth_user"
	contextUserIDKey = "auth_user_id"
)

// SyncUserMiddleware ensures the authenticated user exists in DB and is up to date.
// Requires Auth0Middleware to have already attached claims.
func SyncUserMiddleware(userRepo repositories.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		sub := GetAuthSubject(c)
		if sub == "" {
			c.Next()
			return
		}

		// Derive fields from claims
		name := GetAuthName(c)
		picture := GetAuthPicture(c)
		// best-effort email from claims
		var email string
		if claimsAny, exists := c.Get("auth_claims"); exists {
			if claims, ok := claimsAny.(map[string]any); ok {
				if v, ok := claims["email"].(string); ok {
					email = v
				}
			}
		}

		// Find existing by subject
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()
		existing, _ := userRepo.GetBySubject(ctx, sub)

		// Build a username heuristic: prefer email local part, else sub suffix
		username := "user"
		if email != "" {
			if at := strings.IndexByte(email, '@'); at > 0 {
				username = email[:at]
			}
		} else if i := strings.LastIndex(sub, "|"); i >= 0 && i+1 < len(sub) {
			username = sub[i+1:]
		}

		if existing == nil {
			// Create new user
			user := entities.NewUser(sub, username, email, name, picture)
			_ = userRepo.Create(ctx, user)
			existing = user
		} else {
			// Update changed fields
			updated := false
			if name != "" && name != existing.Name {
				existing.Name = name
				updated = true
			}
			if email != "" && email != existing.Email {
				existing.Email = email
				updated = true
			}
			if picture != "" && picture != existing.Avatar {
				existing.Avatar = picture
				updated = true
			}
			if updated {
				existing.UpdatedAt = time.Now()
				_ = userRepo.Update(ctx, existing)
			}
		}

		// Attach user to context for handlers
		c.Set(contextUserKey, existing)
		c.Set(contextUserIDKey, existing.ID)
		c.Next()
	}
}

// GetAuthUser returns the synced user from context if available.
func GetAuthUser(c *gin.Context) (*entities.User, bool) {
	val, ok := c.Get(contextUserKey)
	if !ok {
		return nil, false
	}
	user, ok := val.(*entities.User)
	return user, ok
}

// GetAuthUserID returns the ObjectID of the synced user from context, if available.
func GetAuthUserID(c *gin.Context) primitive.ObjectID {
	idAny, exists := c.Get(contextUserIDKey)
	if !exists {
		return primitive.NilObjectID
	}
	if oid, ok := idAny.(primitive.ObjectID); ok {
		return oid
	}
	return primitive.NilObjectID
}
