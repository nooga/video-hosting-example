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
	validate := newAuth0Validator(domain, audience)
	if validate == nil {
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

		claims, err := validate(authHeader)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.Set("auth_claims", claims)
		c.Next()
	}
}

// OptionalAuth0Middleware attaches JWT claims when a valid Bearer token is present.
// Missing or invalid tokens are ignored so public handlers can serve anonymous users too.
func OptionalAuth0Middleware(domain, audience string) gin.HandlerFunc {
	validate := newAuth0Validator(domain, audience)
	if validate == nil {
		return func(c *gin.Context) { c.Next() }
	}

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		claims, err := validate(authHeader)
		if err == nil {
			c.Set("auth_claims", claims)
		}
		c.Next()
	}
}

type auth0Validator func(authHeader string) (jwt.MapClaims, error)

func newAuth0Validator(domain, audience string) auth0Validator {
	iss := strings.TrimSuffix(domain, "/")
	if !strings.HasPrefix(iss, "http") {
		iss = "https://" + iss
	}
	issuer := iss + "/"
	jwksURL := issuer + ".well-known/jwks.json"

	jwks, err := keyfunc.Get(jwksURL, keyfunc.Options{RefreshInterval: time.Hour})
	if err != nil {
		return nil
	}

	return func(authHeader string) (jwt.MapClaims, error) {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return nil, errors.New("invalid Authorization header")
		}

		token, err := jwt.Parse(parts[1], jwks.Keyfunc)
		if err != nil || !token.Valid {
			return nil, errors.New("invalid token")
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return nil, errors.New("invalid token claims")
		}

		if !claims.VerifyIssuer(issuer, true) {
			return nil, errors.New("invalid issuer")
		}
		if audience != "" && !claims.VerifyAudience(audience, true) {
			return nil, errors.New("invalid audience")
		}
		if err := validateStandardClaims(claims); err != nil {
			return nil, err
		}

		return claims, nil
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

// GetAuthName extracts a displayable name from claims
func GetAuthName(c *gin.Context) string {
	claimsAny, exists := c.Get("auth_claims")
	if !exists {
		return ""
	}
	claims, ok := claimsAny.(jwt.MapClaims)
	if !ok {
		return ""
	}
	if name, ok := claims["name"].(string); ok && name != "" {
		return name
	}
	if nickname, ok := claims["nickname"].(string); ok && nickname != "" {
		return nickname
	}
	if email, ok := claims["email"].(string); ok && email != "" {
		return email
	}
	return ""
}

// GetAuthPicture extracts the avatar URL from claims if present
func GetAuthPicture(c *gin.Context) string {
	claimsAny, exists := c.Get("auth_claims")
	if !exists {
		return ""
	}
	claims, ok := claimsAny.(jwt.MapClaims)
	if !ok {
		return ""
	}
	if pic, ok := claims["picture"].(string); ok {
		return pic
	}
	return ""
}
