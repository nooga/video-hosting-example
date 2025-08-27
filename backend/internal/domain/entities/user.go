package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Subject   string             `json:"subject" bson:"subject"`
	Username  string             `json:"username" bson:"username"`
	Email     string             `json:"email" bson:"email"`
	Name      string             `json:"name" bson:"name"`
	Avatar    string             `json:"avatar" bson:"avatar"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

// NewUser creates a new user entity
func NewUser(subject, username, email, name, avatar string) *User {
	now := time.Now()
	return &User{
		ID:        primitive.NewObjectID(),
		Subject:   subject,
		Username:  username,
		Email:     email,
		Name:      name,
		Avatar:    avatar,
		CreatedAt: now,
		UpdatedAt: now,
	}
}
