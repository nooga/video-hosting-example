package storage

import (
	"context"
	"io"

	"youtube-worker/pkg/config"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinIOClient struct {
	client               *minio.Client
	videosBucketName     string
	thumbnailsBucketName string
}

func NewMinIOClient(cfg config.MinIOConfig) (*MinIOClient, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}

	return &MinIOClient{
		client:               client,
		videosBucketName:     cfg.BucketName,
		thumbnailsBucketName: cfg.BucketName,
	}, nil
}

func (m *MinIOClient) GetBucketName() string {
	return m.videosBucketName
}

func (m *MinIOClient) GetVideosBucketName() string {
	return m.videosBucketName
}

func (m *MinIOClient) GetThumbnailsBucketName() string {
	return m.thumbnailsBucketName
}

func (m *MinIOClient) DownloadFile(ctx context.Context, objectName string) (*minio.Object, error) {
	return m.client.GetObject(ctx, m.videosBucketName, objectName, minio.GetObjectOptions{})
}

func (m *MinIOClient) DownloadThumbnail(ctx context.Context, objectName string) (*minio.Object, error) {
	return m.client.GetObject(ctx, m.thumbnailsBucketName, objectName, minio.GetObjectOptions{})
}

func (m *MinIOClient) UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) error {
	_, err := m.client.PutObject(ctx, m.videosBucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (m *MinIOClient) UploadThumbnail(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) error {
	_, err := m.client.PutObject(ctx, m.thumbnailsBucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (m *MinIOClient) FileExists(ctx context.Context, objectName string) (bool, error) {
	_, err := m.client.StatObject(ctx, m.videosBucketName, objectName, minio.StatObjectOptions{})
	if err != nil {
		// Check if error is because file doesn't exist
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (m *MinIOClient) ThumbnailExists(ctx context.Context, objectName string) (bool, error) {
	_, err := m.client.StatObject(ctx, m.thumbnailsBucketName, objectName, minio.StatObjectOptions{})
	if err != nil {
		// Check if error is because file doesn't exist
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (m *MinIOClient) GetFileInfo(ctx context.Context, objectName string) (minio.ObjectInfo, error) {
	return m.client.StatObject(ctx, m.videosBucketName, objectName, minio.StatObjectOptions{})
}

func (m *MinIOClient) GetThumbnailInfo(ctx context.Context, objectName string) (minio.ObjectInfo, error) {
	return m.client.StatObject(ctx, m.thumbnailsBucketName, objectName, minio.StatObjectOptions{})
}

func (m *MinIOClient) DeleteFile(ctx context.Context, objectName string) error {
	return m.client.RemoveObject(ctx, m.videosBucketName, objectName, minio.RemoveObjectOptions{})
}

func (m *MinIOClient) DeleteThumbnail(ctx context.Context, objectName string) error {
	return m.client.RemoveObject(ctx, m.thumbnailsBucketName, objectName, minio.RemoveObjectOptions{})
}
