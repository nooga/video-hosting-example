package middleware

import (
	"strings"
	"unicode"

	"youtube-backend/internal/domain/entities"

	"github.com/gin-gonic/gin"
)

// IsOpaqueDisplayName reports names that are not suitable for UI (OAuth subject suffixes, numeric IDs, etc.).
func IsOpaqueDisplayName(name string) bool {
	name = strings.TrimSpace(name)
	if name == "" || name == "user" || name == "anonymous" {
		return true
	}
	if strings.Contains(name, "|") {
		return true
	}
	if isNumericID(name) {
		return true
	}
	return false
}

func isNumericID(value string) bool {
	if value == "" {
		return false
	}
	for _, r := range value {
		if !unicode.IsDigit(r) {
			return false
		}
	}
	return len(value) >= 6
}

func emailLocalPart(email string) string {
	email = strings.TrimSpace(email)
	if at := strings.IndexByte(email, '@'); at > 0 {
		return email[:at]
	}
	return email
}

// UserDisplayName returns a human-readable label from a synced user record.
func UserDisplayName(u *entities.User) string {
	if u == nil {
		return ""
	}
	if u.Name != "" && !IsOpaqueDisplayName(u.Name) {
		return u.Name
	}
	if u.Email != "" {
		if local := emailLocalPart(u.Email); local != "" && !IsOpaqueDisplayName(local) {
			return local
		}
	}
	if u.Username != "" && u.Username != "user" && !IsOpaqueDisplayName(u.Username) {
		return u.Username
	}
	return ""
}

// GetAuthDisplayName resolves a display name from JWT claims and the synced user.
func GetAuthDisplayName(c *gin.Context) string {
	if name := GetAuthName(c); name != "" && !IsOpaqueDisplayName(name) {
		return name
	}
	if user, ok := GetAuthUser(c); ok {
		if name := UserDisplayName(user); name != "" {
			return name
		}
	}
	return ""
}
