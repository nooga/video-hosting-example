package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"youtube-backend/pkg/config"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

type MinIOClient struct {
	client               *minio.Client
	videosBucketName     string
	thumbnailsBucketName string
	logger               *zap.Logger
}

// NewMinIOClient creates a new MinIO client
func NewMinIOClient(cfg config.MinIOConfig, logger *zap.Logger) (*MinIOClient, error) {
	fmt.Printf("MinIO Config: %+v\n", cfg) // Debug print to verify config
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}

	minioClient := &MinIOClient{
		client:               client,
		videosBucketName:     cfg.BucketName,
		thumbnailsBucketName: cfg.BucketName,
		logger:               logger,
	}

	// Initialize buckets and policies
	if err := minioClient.initializeBuckets(context.Background()); err != nil {
		return nil, err
	}

	return minioClient, nil
}

// initializeBuckets creates necessary buckets and sets up public access policies
func (m *MinIOClient) initializeBuckets(ctx context.Context) error {
	buckets := []string{m.videosBucketName, m.thumbnailsBucketName}

	// Create buckets if they don't exist
	for _, bucketName := range buckets {
		exists, err := m.client.BucketExists(ctx, bucketName)
		if err != nil {
			return err
		}

		if !exists {
			err = m.client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
			if err != nil {
				return err
			}
			m.logger.Info("Created MinIO bucket", zap.String("bucket", bucketName))
		} else {
			m.logger.Info("MinIO bucket already exists", zap.String("bucket", bucketName))
		}
	}

	// Set up bucket policies for public access
	if err := m.setPublicAccessPolicies(ctx); err != nil {
		return err
	}

	return nil
}

// setPublicAccessPolicies sets up public read access for specific paths
func (m *MinIOClient) setPublicAccessPolicies(ctx context.Context) error {
	// Policy for videos bucket - allow public read access to processed/* and thumbnails/*
	videosPolicy := map[string]interface{}{
		"Version": "2012-10-17",
		"Statement": []map[string]interface{}{
			{
				"Effect": "Allow",
				"Principal": map[string]string{
					"AWS": "*",
				},
				"Action": []string{
					"s3:GetObject",
				},
				"Resource": []string{
					"arn:aws:s3:::" + m.videosBucketName + "/processed/*",
					"arn:aws:s3:::" + m.videosBucketName + "/thumbnails/*",
				},
			},
		},
	}

	// Policy for thumbnails bucket - allow public read access to all objects
	thumbnailsPolicy := map[string]interface{}{
		"Version": "2012-10-17",
		"Statement": []map[string]interface{}{
			{
				"Effect": "Allow",
				"Principal": map[string]string{
					"AWS": "*",
				},
				"Action": []string{
					"s3:GetObject",
				},
				"Resource": []string{
					"arn:aws:s3:::" + m.thumbnailsBucketName + "/*",
				},
			},
		},
	}

	// Apply policies
	videosPolicyJSON, err := json.Marshal(videosPolicy)
	if err != nil {
		return err
	}

	thumbnailsPolicyJSON, err := json.Marshal(thumbnailsPolicy)
	if err != nil {
		return err
	}

	// Try to set bucket policies, but don't fail if policies are not supported
	if err := m.client.SetBucketPolicy(ctx, m.videosBucketName, string(videosPolicyJSON)); err != nil {
		m.logger.Warn("Failed to set bucket policy (policies may not be supported)",
			zap.String("bucket", m.videosBucketName),
			zap.Error(err))
	} else {
		m.logger.Info("Set public access policy for bucket", zap.String("bucket", m.videosBucketName))
	}

	if err := m.client.SetBucketPolicy(ctx, m.thumbnailsBucketName, string(thumbnailsPolicyJSON)); err != nil {
		m.logger.Warn("Failed to set bucket policy (policies may not be supported)",
			zap.String("bucket", m.thumbnailsBucketName),
			zap.Error(err))
	} else {
		m.logger.Info("Set public access policy for bucket", zap.String("bucket", m.thumbnailsBucketName))
	}

	return nil
}

// GetClient returns the MinIO client
func (m *MinIOClient) GetClient() *minio.Client {
	return m.client
}

// GetVideosBucketName returns the videos bucket name
func (m *MinIOClient) GetVideosBucketName() string {
	return m.videosBucketName
}

// GetThumbnailsBucketName returns the thumbnails bucket name
func (m *MinIOClient) GetThumbnailsBucketName() string {
	return m.thumbnailsBucketName
}

// GetBucketName returns the videos bucket name (for backward compatibility)
func (m *MinIOClient) GetBucketName() string {
	return m.videosBucketName
}

// UploadFile uploads a file to the videos bucket
func (m *MinIOClient) UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) error {
	_, err := m.client.PutObject(ctx, m.videosBucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

// UploadThumbnail uploads a thumbnail to the thumbnails bucket
func (m *MinIOClient) UploadThumbnail(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) error {
	_, err := m.client.PutObject(ctx, m.thumbnailsBucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

// DownloadFile downloads a file from the videos bucket
func (m *MinIOClient) DownloadFile(ctx context.Context, objectName string) (*minio.Object, error) {
	return m.client.GetObject(ctx, m.videosBucketName, objectName, minio.GetObjectOptions{})
}

// DownloadThumbnail downloads a thumbnail from the thumbnails bucket
func (m *MinIOClient) DownloadThumbnail(ctx context.Context, objectName string) (*minio.Object, error) {
	return m.client.GetObject(ctx, m.thumbnailsBucketName, objectName, minio.GetObjectOptions{})
}

// DeleteFile deletes a file from the videos bucket
func (m *MinIOClient) DeleteFile(ctx context.Context, objectName string) error {
	return m.client.RemoveObject(ctx, m.videosBucketName, objectName, minio.RemoveObjectOptions{})
}

// DeleteThumbnail deletes a thumbnail from the thumbnails bucket
func (m *MinIOClient) DeleteThumbnail(ctx context.Context, objectName string) error {
	return m.client.RemoveObject(ctx, m.thumbnailsBucketName, objectName, minio.RemoveObjectOptions{})
}

// GetFileInfo gets file information from the videos bucket
func (m *MinIOClient) GetFileInfo(ctx context.Context, objectName string) (minio.ObjectInfo, error) {
	return m.client.StatObject(ctx, m.videosBucketName, objectName, minio.StatObjectOptions{})
}

// GetThumbnailInfo gets thumbnail information from the thumbnails bucket
func (m *MinIOClient) GetThumbnailInfo(ctx context.Context, objectName string) (minio.ObjectInfo, error) {
	return m.client.StatObject(ctx, m.thumbnailsBucketName, objectName, minio.StatObjectOptions{})
}

// ListFiles lists files in the videos bucket
func (m *MinIOClient) ListFiles(ctx context.Context, prefix string) <-chan minio.ObjectInfo {
	return m.client.ListObjects(ctx, m.videosBucketName, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})
}

// ListThumbnails lists thumbnails in the thumbnails bucket
func (m *MinIOClient) ListThumbnails(ctx context.Context, prefix string) <-chan minio.ObjectInfo {
	return m.client.ListObjects(ctx, m.thumbnailsBucketName, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})
}

// GeneratePresignedURL generates a presigned URL for file access from videos bucket
func (m *MinIOClient) GeneratePresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	url, err := m.client.PresignedGetObject(ctx, m.videosBucketName, objectName, expiry, nil)
	if err != nil {
		return "", err
	}
	return url.String(), nil
}

// GeneratePresignedThumbnailURL generates a presigned URL for thumbnail access
func (m *MinIOClient) GeneratePresignedThumbnailURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	url, err := m.client.PresignedGetObject(ctx, m.thumbnailsBucketName, objectName, expiry, nil)
	if err != nil {
		return "", err
	}
	return url.String(), nil
}
