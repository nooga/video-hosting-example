package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VideoStatus string

const (
	VideoStatusUploaded   VideoStatus = "uploaded"
	VideoStatusProcessing VideoStatus = "processing"
	VideoStatusReady      VideoStatus = "ready"
	VideoStatusFailed     VideoStatus = "failed"
)

type VideoFormat struct {
	Quality  string `json:"quality" bson:"quality"` // "480p", "720p", "1080p"
	Filename string `json:"filename" bson:"filename"`
	Size     int64  `json:"size" bson:"size"`
}

type Video struct {
	ID               primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UploaderUserID   primitive.ObjectID `json:"uploader_user_id" bson:"uploader_user_id"`
	Title            string             `json:"title" bson:"title"`
	Description      string             `json:"description" bson:"description"`
	UploadedBy       string             `json:"uploaded_by" bson:"uploaded_by"`
	UploaderName     string             `json:"uploader_name" bson:"uploader_name"`
	UploaderAvatar   string             `json:"uploader_avatar" bson:"uploader_avatar"`
	OriginalFilename string             `json:"original_filename" bson:"original_filename"`
	Duration         float64            `json:"duration" bson:"duration"` // in seconds
	Size             int64              `json:"size" bson:"size"`         // in bytes
	Status           VideoStatus        `json:"status" bson:"status"`
	Formats          []VideoFormat      `json:"formats" bson:"formats"`
	Thumbnails       []string           `json:"thumbnails" bson:"thumbnails"`
	CreatedAt        time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt        time.Time          `json:"updated_at" bson:"updated_at"`
}

// NewVideo creates a new video entity
func NewVideo(uploaderUserID primitive.ObjectID, title, description, uploadedBy, uploaderName, uploaderAvatar, originalFilename string, size int64) *Video {
	now := time.Now()
	return &Video{
		ID:               primitive.NewObjectID(),
		UploaderUserID:   uploaderUserID,
		Title:            title,
		Description:      description,
		UploadedBy:       uploadedBy,
		UploaderName:     uploaderName,
		UploaderAvatar:   uploaderAvatar,
		OriginalFilename: originalFilename,
		Size:             size,
		Status:           VideoStatusUploaded,
		Formats:          []VideoFormat{},
		Thumbnails:       []string{},
		CreatedAt:        now,
		UpdatedAt:        now,
	}
}

// UpdateStatus updates the video status and updated_at timestamp
func (v *Video) UpdateStatus(status VideoStatus) {
	v.Status = status
	v.UpdatedAt = time.Now()
}

// AddFormat adds a new video format
func (v *Video) AddFormat(quality, filename string, size int64) {
	v.Formats = append(v.Formats, VideoFormat{
		Quality:  quality,
		Filename: filename,
		Size:     size,
	})
	v.UpdatedAt = time.Now()
}

// AddThumbnail adds a new thumbnail
func (v *Video) AddThumbnail(filename string) {
	v.Thumbnails = append(v.Thumbnails, filename)
	v.UpdatedAt = time.Now()
}

// IsReady checks if video is ready for viewing
func (v *Video) IsReady() bool {
	return v.Status == VideoStatusReady
}

// HasFormat checks if video has a specific format
func (v *Video) HasFormat(quality string) bool {
	for _, format := range v.Formats {
		if format.Quality == quality {
			return true
		}
	}
	return false
}
