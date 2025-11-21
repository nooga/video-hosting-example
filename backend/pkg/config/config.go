package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	Environment string
	MongoURI    string
	RedisURI    string
	FrontendURL string
	MinIO       MinIOConfig
	Auth0       Auth0Config
	Moderation  ModerationConfig
}

type MinIOConfig struct {
	Endpoint   string
	AccessKey  string
	SecretKey  string
	UseSSL     bool
	BucketName string
}

type Auth0Config struct {
	Domain   string
	Audience string
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
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("GO_ENV", "development"),
		MongoURI:    getEnv("MONGODB_URI", "mongodb://admin:password@localhost:27017/youtube?authSource=admin"),
		RedisURI:    getEnv("REDIS_URI", "redis://localhost:6379"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		MinIO: MinIOConfig{
			Endpoint:   getEnv("MINIO_ENDPOINT", "localhost:9000"),
			AccessKey:  getEnv("MINIO_ACCESS_KEY", "minioadmin"),
			SecretKey:  getEnv("MINIO_SECRET_KEY", "minioadmin"),
			UseSSL:     getEnv("MINIO_USE_SSL", "false") == "true",
			BucketName: getEnv("MINIO_BUCKET_NAME", "videos"),
		},
		Auth0: Auth0Config{
			Domain:   getEnv("AUTH0_DOMAIN", ""),
			Audience: getEnv("AUTH0_AUDIENCE", ""),
		},
		// LLM-powered comment moderation (optional)
		// Compatible with OpenAI, Azure OpenAI, Ollama (self-hosted), and any OpenAI-compatible API
		// For self-hosting without costs: use Ollama (https://ollama.ai) with models like llama2, mistral, mixtral
		// Examples:
		//   - OpenAI: LLM_API_URL=https://api.openai.com/v1
		//   - Ollama: LLM_API_URL=http://localhost:11434/v1
		//   - Azure:  LLM_API_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
		Moderation: ModerationConfig{
			Enabled:  getEnv("LLM_ENABLED", "false") == "true",
			APIURL:   getEnv("LLM_API_URL", ""),
			APIToken: getEnv("LLM_API_TOKEN", ""),
			Model:    getEnv("LLM_MODEL", ""),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
