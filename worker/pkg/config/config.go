package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	MongoURI   string
	RedisURI   string
	MinIO      MinIOConfig
	Moderation ModerationConfig
}

type MinIOConfig struct {
	Endpoint   string
	AccessKey  string
	SecretKey  string
	UseSSL     bool
	BucketName string
}

type ModerationConfig struct {
	Enabled  bool
	APIURL   string
	APIToken string
	Model    string
}

func Load() *Config {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	return &Config{
		MongoURI: getEnv("MONGODB_URI", "mongodb://admin:password@localhost:27017/youtube?authSource=admin"),
		RedisURI: getEnv("REDIS_URI", "redis://localhost:6379"),
		MinIO: MinIOConfig{
			Endpoint:   getEnv("MINIO_ENDPOINT", "localhost:9000"),
			AccessKey:  getEnv("MINIO_ACCESS_KEY", "minioadmin"),
			SecretKey:  getEnv("MINIO_SECRET_KEY", "minioadmin"),
			UseSSL:     getEnv("MINIO_USE_SSL", "false") == "true",
			BucketName: getEnv("MINIO_BUCKET_NAME", "videos"),
		},
		Moderation: ModerationConfig{
			Enabled:  getEnv("MODERATION_ENABLED", "false") == "true",
			APIURL:   getEnv("MODERATION_API_URL", ""),
			APIToken: getEnv("MODERATION_API_TOKEN", ""),
			Model:    getEnv("MODERATION_MODEL", ""),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
