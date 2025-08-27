package repositories

import (
	"context"
	"fmt"

	"youtube-backend/internal/domain/entities"
	"youtube-backend/internal/domain/repositories"
	"youtube-backend/internal/infrastructure/database"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type UserRepositoryImpl struct {
	collection *mongo.Collection
}

func NewUserRepository(db *database.MongoDB) repositories.UserRepository {
	return &UserRepositoryImpl{
		collection: db.GetCollection("users"),
	}
}

func (r *UserRepositoryImpl) Create(ctx context.Context, user *entities.User) error {
	// Check for duplicate subject, username or email
	if user.Subject != "" {
		existingBySub, _ := r.GetBySubject(ctx, user.Subject)
		if existingBySub != nil {
			return fmt.Errorf("subject already exists")
		}
	}

	existingUser, _ := r.GetByUsername(ctx, user.Username)
	if existingUser != nil {
		return fmt.Errorf("username already exists")
	}

	existingUser, _ = r.GetByEmail(ctx, user.Email)
	if existingUser != nil {
		return fmt.Errorf("email already exists")
	}

	_, err := r.collection.InsertOne(ctx, user)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (r *UserRepositoryImpl) GetByID(ctx context.Context, id primitive.ObjectID) (*entities.User, error) {
	var user entities.User
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func (r *UserRepositoryImpl) GetByUsername(ctx context.Context, username string) (*entities.User, error) {
	var user entities.User
	err := r.collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Return nil without error for "not found" case
		}
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}
	return &user, nil
}

func (r *UserRepositoryImpl) GetByEmail(ctx context.Context, email string) (*entities.User, error) {
	var user entities.User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Return nil without error for "not found" case
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return &user, nil
}

func (r *UserRepositoryImpl) GetBySubject(ctx context.Context, subject string) (*entities.User, error) {
	var user entities.User
	err := r.collection.FindOne(ctx, bson.M{"subject": subject}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user by subject: %w", err)
	}
	return &user, nil
}

func (r *UserRepositoryImpl) Update(ctx context.Context, user *entities.User) error {
	filter := bson.M{"_id": user.ID}
	update := bson.M{"$set": user}

	result, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (r *UserRepositoryImpl) Delete(ctx context.Context, id primitive.ObjectID) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	if result.DeletedCount == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (r *UserRepositoryImpl) List(ctx context.Context, limit, offset int) ([]*entities.User, error) {
	opts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer cursor.Close(ctx)

	var users []*entities.User
	for cursor.Next(ctx) {
		var user entities.User
		if err := cursor.Decode(&user); err != nil {
			return nil, fmt.Errorf("failed to decode user: %w", err)
		}
		users = append(users, &user)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return users, nil
}
