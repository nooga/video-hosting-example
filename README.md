# 🎬 Video Processing & Sharing Platform

A complete YouTube-like video processing and sharing platform built with modern technologies, featuring **parallel video processing workers**, **FFmpeg transcoding**, **thumbnail generation**, and containerized deployment.

## 🏗️ Architecture

This platform follows a microservices architecture with **distributed video processing** and **AI-powered moderation**:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Go Backend API │    │  Video Workers  │
│   (Port: 3000)  │◄──►│   (Port: 8080)   │◄──►│  (Parallel)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        ▼                        │
         │              ┌─────────────────┐                │
         │              │     MongoDB     │                │
         │              │  (Port: 27017)  │                │
         │              └─────────────────┘                │
         │                        │                        │
         │                        ▼                        │
         │              ┌─────────────────┐                │
         └─────────────►│   Redis Queue   │◄───────────────┘
                        │   (Port: 6379)  │
                        └─────────────────┘
                                 │
                                 ▼
                       ┌─────────────────┐         ┌──────────────────┐
                       │      MinIO      │         │ LLM API (Optional)│
                       │   (Port: 9000)  │         │ Comment Moderation│
                       └─────────────────┘         └──────────────────┘
                                                             ▲
                                                             │
                                                   (Workers call for moderation)
```

### Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Go 1.21 + Gin + Domain-Driven Design (DDD)
- **Workers**: Go + FFmpeg for video processing
- **Database**: MongoDB 7.0 (metadata, user data)
- **Queue**: Redis 7.0 (distributed job processing)
- **Storage**: MinIO (S3-compatible, video files)
- **Processing**: FFmpeg (video transcoding & thumbnails)
- **AI Moderation**: OpenAI-compatible LLM API (optional)
- **Deployment**: Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd youtube-example
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings if needed
   ```

3. **Start all services**

   ```bash
   docker-compose up -d
   ```

4. **Wait for initialization (about 30-60 seconds)**

   ```bash
   # Check service status
   docker-compose ps

   # View logs
   docker-compose logs -f
   ```

5. **Access the application**
   - **Backend API**: http://localhost:8080
   - **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
   - **Frontend**: http://localhost:3000 (when implemented)

## 🎯 Features

### ✅ **Fully Implemented**

**🎥 Video Processing Pipeline**

- ✅ **Video Upload**: Multipart upload with validation
- ✅ **Distributed Processing**: Redis job queue with parallel workers
- ✅ **FFmpeg Transcoding**: 480p, 720p, 1080p quality options
- ✅ **Thumbnail Generation**: Automatic thumbnail creation
- ✅ **Progress Tracking**: Real-time job status monitoring
- ✅ **File Storage**: Organized MinIO structure (original/processed/thumbnails)

**🔧 Backend Infrastructure**

- ✅ **RESTful API**: Complete CRUD operations
- ✅ **Domain-Driven Design**: Clean architecture
- ✅ **Job Queue**: Redis-based distributed processing
- ✅ **Database Operations**: MongoDB with proper indexing
- ✅ **File Streaming**: Direct video streaming with quality selection

**🤖 AI Features**

- ✅ **LLM Comment Moderation**: OpenAI-compatible API integration
- ✅ **Async Processing**: Queue-based moderation workflow
- ✅ **Graceful Fallback**: Auto-approval if LLM unavailable
- ✅ **Multi-Provider Support**: Works with OpenAI, Azure, local LLMs

**🏗️ DevOps & Deployment**

- ✅ **Docker Compose**: Complete containerized stack
- ✅ **Auto-initialization**: MinIO buckets and permissions
- ✅ **Health Checks**: Service monitoring endpoints
- ✅ **Structured Logging**: Comprehensive error tracking

### 🚧 **Next Phase** (Ready for Implementation)

- [ ] **React Frontend**: Upload interface and video player
- [ ] **User Authentication**: JWT-based auth system
- [ ] **Real-time Updates**: WebSocket progress notifications
- [ ] **Advanced Features**: Video search, playlists, comments

## 🛠️ API Endpoints

### Videos

```bash
# Upload video
POST   /api/v1/videos/upload
curl -X POST -F "video=@video.mp4" -F "title=My Video" http://localhost:8080/api/v1/videos/upload

# List videos (paginated)
GET    /api/v1/videos?page=1&limit=20
curl http://localhost:8080/api/v1/videos

# Get video details
GET    /api/v1/videos/:id
curl http://localhost:8080/api/v1/videos/64a7b8c9d1e2f3a4b5c6d7e8

# Stream video (original or processed)
GET    /api/v1/videos/:id/stream?quality=720p
curl http://localhost:8080/api/v1/videos/64a7b8c9d1e2f3a4b5c6d7e8/stream

# Trigger manual processing
POST   /api/v1/videos/:id/process
curl -X POST http://localhost:8080/api/v1/videos/64a7b8c9d1e2f3a4b5c6d7e8/process
```

### Jobs

```bash
# Get job status
GET    /api/v1/jobs/:id
curl http://localhost:8080/api/v1/jobs/64a7b8c9d1e2f3a4b5c6d7e9

# Get all jobs for a video
GET    /api/v1/jobs/video/:videoId
curl http://localhost:8080/api/v1/jobs/video/64a7b8c9d1e2f3a4b5c6d7e8

# Get active processing jobs
GET    /api/v1/jobs/active
curl http://localhost:8080/api/v1/jobs/active
```

### Comments

```bash
# List comments for a video (public, shows pending for authenticated author)
GET    /api/v1/videos/:id/comments?page=1&limit=20
curl http://localhost:8080/api/v1/videos/64a7b8c9d1e2f3a4b5c6d7e8/comments

# Create comment (requires authentication if Auth0 configured)
POST   /api/v1/videos/:id/comments
curl -X POST http://localhost:8080/api/v1/videos/64a7b8c9d1e2f3a4b5c6d7e8/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great video!",
    "author_name": "John Doe",
    "author_avatar": "https://example.com/avatar.jpg"
  }'
```

### Health

```bash
# Service health check
GET    /health
curl http://localhost:8080/health
```

## 🤖 AI-Powered Comment Moderation

This platform includes **optional LLM-powered content moderation** for user comments using OpenAI-compatible APIs.

> **💡 Quick Start**: Want free, self-hosted AI moderation? Install [Ollama](https://ollama.ai), run `ollama pull llama2`, and set `LLM_ENABLED=true` with `LLM_API_URL=http://localhost:11434/v1` - no API keys needed!

### Overview

When users post comments, they are automatically sent through an AI moderation system that:

- ✅ Analyzes comment content for policy violations
- ✅ Approves safe comments automatically
- ✅ Rejects inappropriate content with reasons
- ✅ Processes asynchronously via job queue
- ✅ Falls back gracefully if LLM is unavailable

### Configuration

Add these environment variables to enable LLM moderation:

| Variable        | Description                                                      | Required | Default |
| --------------- | ---------------------------------------------------------------- | -------- | ------- |
| `LLM_ENABLED`   | Enable/disable LLM moderation                                    | No       | `false` |
| `LLM_API_URL`   | OpenAI-compatible API endpoint (OpenAI, Ollama, Azure, etc.)     | Yes\*    | -       |
| `LLM_API_TOKEN` | API authentication bearer token (not required for Ollama)        | Yes\*    | -       |
| `LLM_MODEL`     | Model identifier - e.g., `gpt-4`, `llama2`, `mistral` (optional) | No       | -       |

\*_Required only if `LLM_ENABLED=true`_

### Setup Examples

#### Using OpenAI

```bash
LLM_ENABLED=true
LLM_API_URL=https://api.openai.com/v1
LLM_API_TOKEN=sk-your-openai-api-key
LLM_MODEL=gpt-4
```

#### Using Azure OpenAI

```bash
LLM_ENABLED=true
LLM_API_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
LLM_API_TOKEN=your-azure-api-key
LLM_MODEL=gpt-4
```

#### Using Ollama (Self-Hosted, Free)

Ollama is perfect for self-hosting without API costs. [Install Ollama](https://ollama.ai) and run:

```bash
# Pull a model (first time only)
ollama pull llama2

# Start Ollama (runs as a service)
ollama serve

# Configure the platform
LLM_ENABLED=true
LLM_API_URL=http://localhost:11434/v1
LLM_API_TOKEN=optional  # Ollama doesn't require tokens by default
LLM_MODEL=llama2
```

**Recommended Ollama models for moderation:**

- `llama2` - Good balance of speed and accuracy
- `mistral` - Fast and efficient
- `mixtral` - More accurate, slower
- `phi` - Very fast, smaller model

**Docker networking note:** If running the platform in Docker and Ollama on your host machine:

- **macOS/Windows**: Use `http://host.docker.internal:11434/v1`
- **Linux**: Use `http://172.17.0.1:11434/v1` or add `--network=host` to your Docker run command

#### Using Other Local LLMs (LM Studio, LocalAI)

```bash
LLM_ENABLED=true
LLM_API_URL=http://localhost:1234/v1  # LM Studio default port
LLM_API_TOKEN=not-required
LLM_MODEL=your-model-name
```

#### Disabling Moderation (Auto-approve all comments)

```bash
LLM_ENABLED=false
# Or simply omit the variables
```

### How It Works

```
1. User posts comment
   ↓
2. Backend creates comment with status "pending"
   ↓
3. Moderation job sent to Redis queue
   ↓
4. Worker picks up job and fetches comment
   ↓
5. LLM analyzes comment content via Chat Completions API
   ↓
6. LLM responds with JSON: {"ok": true/false, "reason": "..."}
   ↓
7. Comment status updated:
   • "published" - Comment approved
   • "rejected" - Comment denied (reason stored)
   • "error" - API failure (logged)
```

### API Integration

The system uses the **OpenAI Chat Completions API format** (`/v1/chat/completions`), making it compatible with:

- **OpenAI** - GPT-3.5, GPT-4, GPT-4 Turbo
- **Azure OpenAI Service** - Enterprise-grade OpenAI models
- **Ollama** - Self-hosted open-source LLMs (Llama 2, Mistral, Mixtral, etc.)
- **LM Studio** - Local LLM inference with OpenAI-compatible API
- **LocalAI** - Self-hosted OpenAI alternative
- **Anthropic Claude** - Via OpenAI-compatible proxy
- **Together AI** - Hosted open-source models
- **Anyscale Endpoints** - Llama 2, Mistral, and more
- **Any OpenAI-compatible API endpoint**

> **💡 Tip**: For self-hosting without external API costs, use **Ollama** - it's free, runs locally, and supports many open-source models like Llama 2, Mistral, and Code Llama.

**Request Format:**

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are moderating comments. Respond with JSON..."
    },
    {
      "role": "user",
      "content": "Comment: [user's comment text]"
    }
  ],
  "stream": false
}
```

**Expected Response:**

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "{\"ok\": true}"
      }
    }
  ]
}
```

### Fallback Behavior

The moderation system is designed to **never block user experience**:

- **LLM Disabled**: Comments auto-approved immediately
- **API Unreachable**: Comments auto-approved (error logged)
- **Invalid Response**: Comments auto-approved (error logged)
- **Timeout (30s)**: Request fails, comment auto-approved

### Implementation Details

- **Queue**: Redis-based asynchronous processing
- **Timeout**: 30 seconds per request
- **Status Tracking**: Comments have states: `pending`, `published`, `rejected`, `error`
- **Error Handling**: Comprehensive logging for debugging
- **Privacy**: Only comment text sent to LLM (no user PII)

### Testing Moderation

With moderation enabled, test the system:

```bash
# Create a test comment (requires authentication)
curl -X POST http://localhost:8080/api/v1/videos/{VIDEO_ID}/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a test comment",
    "author_name": "Test User"
  }'

# Check comment status
curl http://localhost:8080/api/v1/videos/{VIDEO_ID}/comments

# Monitor worker logs to see moderation in action
docker-compose logs -f worker1
```

**Note:** The default system prompt includes a test rule that rejects comments about "bananas" for easy testing.

## 🧪 Testing

### Automated Test

Run the complete test pipeline:

```bash
./scripts/test-upload.sh
```

This script will:

1. Create a test video (if FFmpeg is available)
2. Upload the video via API
3. Monitor processing jobs
4. Show final results

### Manual Testing

```bash
# 1. Check API health
curl http://localhost:8080/health

# 2. Upload a video
curl -X POST \
  -F "video=@your-video.mp4" \
  -F "title=Test Video" \
  -F "description=Test upload" \
  http://localhost:8080/api/v1/videos/upload

# 3. Monitor processing
curl http://localhost:8080/api/v1/jobs/active

# 4. Check final video status
curl http://localhost:8080/api/v1/videos/{VIDEO_ID}
```

## 📊 Video Processing Flow

1. **Upload** → Video uploaded to MinIO (`videos/original/`)
2. **Job Creation** → 4 jobs created (1 thumbnail + 3 transcode jobs)
3. **Queue Distribution** → Jobs sent to Redis queue
4. **Worker Processing** → 2 parallel workers process jobs
5. **FFmpeg Processing** → Videos transcoded to multiple formats
6. **Storage** → Processed files saved (`videos/processed/`, `thumbnails/`)
7. **Database Update** → Video metadata updated with new formats
8. **Completion** → Video status changed to "ready"

## 🔧 Configuration

### Environment Variables

| Variable           | Description                     | Default                                                           |
| ------------------ | ------------------------------- | ----------------------------------------------------------------- |
| `PORT`             | Backend server port             | `8080`                                                            |
| `MONGODB_URI`      | MongoDB connection string       | `mongodb://admin:password@mongodb:27017/youtube?authSource=admin` |
| `REDIS_URI`        | Redis connection string         | `redis://redis:6379`                                              |
| `MINIO_ENDPOINT`   | MinIO server endpoint           | `minio:9000`                                                      |
| `MINIO_ACCESS_KEY` | MinIO access key                | `minioadmin`                                                      |
| `MINIO_SECRET_KEY` | MinIO secret key                | `minioadmin`                                                      |
| `FRONTEND_URL`     | Frontend URL for CORS           | `http://localhost:3000`                                           |
| `WORKER_ID`        | Unique worker identifier        | Auto-generated                                                    |
| `LLM_ENABLED`      | Enable LLM comment moderation   | `false`                                                           |
| `LLM_API_URL`      | OpenAI-compatible API endpoint  | -                                                                 |
| `LLM_API_TOKEN`    | LLM API authentication token    | -                                                                 |
| `LLM_MODEL`        | LLM model identifier (optional) | -                                                                 |

### Video Processing Settings

- **Supported Input Formats**: MP4, AVI, MOV, WMV, FLV, WebM, MKV
- **Output Formats**:
  - 480p: H.264, 1Mbps max bitrate
  - 720p: H.264, 2.5Mbps max bitrate
  - 1080p: H.264, 4.5Mbps max bitrate
- **Audio**: AAC, 128kbps
- **Max File Size**: 1GB
- **Parallel Workers**: 2 (configurable)

## 📁 Project Structure

```
youtube-example/
├── backend/                 # Go backend API (22 files)
│   ├── internal/
│   │   ├── domain/         # Business logic (DDD)
│   │   │   ├── entities/   # Video, Job, User entities
│   │   │   ├── repositories/ # Data access interfaces
│   │   │   └── services/   # Business services
│   │   ├── infrastructure/ # External dependencies
│   │   │   ├── database/   # MongoDB client
│   │   │   ├── storage/    # MinIO client
│   │   │   ├── queue/      # Redis client & job publisher
│   │   │   └── repositories/ # Repository implementations
│   │   ├── application/    # Application services
│   │   │   └── handlers/   # HTTP handlers
│   │   └── interfaces/     # API layer
│   │       ├── http/       # Routes and middleware
│   │       └── middleware/ # CORS, logging
│   └── pkg/               # Shared packages
├── worker/                 # Video processing workers (10 files)
│   ├── internal/
│   │   ├── processor/     # FFmpeg transcoding logic
│   │   ├── storage/       # MinIO client
│   │   └── queue/         # Redis & MongoDB clients
│   └── pkg/              # Worker configuration
├── frontend/              # React frontend (future)
├── scripts/               # Setup and testing scripts
│   ├── setup.sh          # Complete platform setup
│   ├── test-upload.sh    # Video upload testing
│   └── init-minio.sh     # MinIO initialization
├── docker-compose.yml    # Container orchestration
└── .env.example         # Environment configuration
```

## 🏃‍♂️ Development

### Backend Development

```bash
cd backend
go mod tidy
go run main.go
```

### Worker Development

```bash
cd worker
go mod tidy
go run main.go
```

### Scaling Workers

```bash
# Scale to 4 workers
docker-compose up --scale worker1=2 --scale worker2=2
```

## 📊 Monitoring

### Container Status

```bash
docker-compose ps
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific services
docker-compose logs -f backend worker1 worker2
```

### MinIO Console

- URL: http://localhost:9001
- Credentials: minioadmin/minioadmin
- View uploaded videos and processed files

### Database Access

```bash
# MongoDB shell
docker exec -it youtube_mongodb mongosh --username admin --password password --authenticationDatabase admin

# Redis CLI
docker exec -it youtube_redis redis-cli
```

## 🔒 Security Considerations

- ✅ File validation and size limits
- ✅ CORS configuration
- ✅ Error handling and logging
- ✅ AI-powered content moderation (optional)
- 🚧 Authentication system (planned)
- 🚧 Rate limiting (planned)
- 🚧 File encryption (planned)

## 🚀 Production Deployment

### Recommended Setup

1. **Container Orchestration**: Kubernetes or Docker Swarm
2. **Load Balancer**: Nginx or HAProxy
3. **Database**: MongoDB Atlas or self-hosted cluster
4. **Storage**: AWS S3 or distributed MinIO
5. **Monitoring**: Prometheus + Grafana
6. **Logging**: ELK Stack

### Performance Optimizations

- Horizontal scaling of workers
- CDN for video delivery
- Database indexing
- Connection pooling
- Caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

## 🎉 Current Status: **Production-Ready Backend & Workers**

✅ **Complete video processing pipeline with distributed workers**  
✅ **FFmpeg transcoding and thumbnail generation**  
✅ **AI-powered comment moderation with LLM integration**  
✅ **RESTful API with job monitoring**  
✅ **Containerized deployment with Docker Compose**  
🚧 **React frontend ready for implementation**

**Built with ❤️ using Go, FFmpeg, MongoDB, Redis, MinIO, and AI.**
