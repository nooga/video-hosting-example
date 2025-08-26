package middleware

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// Auth0Middleware validates incoming JWTs issued by Auth0 and attaches claims to the context
func Auth0Middleware(domain, audience string) gin.HandlerFunc {
	// Normalize issuer to include trailing slash, which is how it appears in Auth0 tokens
	iss := strings.TrimSuffix(domain, "/")
	if !strings.HasPrefix(iss, "http") {
		iss = "https://" + iss
	}
	issuer := iss + "/"
	jwksURL := issuer + ".well-known/jwks.json"

	// Build a JWKS provider with background refresh
	jwks, err := keyfunc.Get(jwksURL, keyfunc.Options{RefreshInterval: time.Hour})
	if err != nil {
		// If JWKS cannot be initialized, create a middleware that always fails fast
		return func(c *gin.Context) {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "auth configuration error"})
		}
	}

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing Authorization header"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid Authorization header"})
			return
		}

		tokenStr := parts[1]
		token, err := jwt.Parse(tokenStr, jwks.Keyfunc)
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
			return
		}

		// Validate issuer, audience, and standard time claims
		if !claims.VerifyIssuer(issuer, true) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid issuer"})
			return
		}
		if audience != "" && !claims.VerifyAudience(audience, true) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid audience"})
			return
		}
		if err := validateStandardClaims(claims); err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		// Attach claims to context for handlers to use
		c.Set("auth_claims", claims)
		c.Next()
	}
}

func validateStandardClaims(mc jwt.MapClaims) error {
	// exp
	if expVal, ok := mc["exp"].(float64); ok {
		exp := time.Unix(int64(expVal), 0)
		if time.Now().After(exp) {
			return errors.New("token expired")
		}
	}
	// nbf
	if nbfVal, ok := mc["nbf"].(float64); ok {
		nbf := time.Unix(int64(nbfVal), 0)
		if time.Now().Before(nbf) {
			return errors.New("token not yet valid")
		}
	}
	return nil
}

// GetAuthSubject extracts the subject (sub) from context claims
func GetAuthSubject(c *gin.Context) string {
	claimsAny, exists := c.Get("auth_claims")
	if !exists {
		return ""
	}
	claims, ok := claimsAny.(jwt.MapClaims)
	if !ok {
		return ""
	}
	if sub, ok := claims["sub"].(string); ok {
		return sub
	}
	return ""
}
