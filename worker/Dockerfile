# Builder stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Cache dependencies first
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build a small static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" -o /app/worker .

# Runtime stage
FROM alpine:latest

# FFmpeg is required by the worker at runtime
RUN apk add --no-cache ca-certificates ffmpeg tzdata \
    && addgroup -S app \
    && adduser -S -G app -h /app app \
    && mkdir -p /app /tmp/video-processing \
    && chown -R app:app /app /tmp/video-processing

WORKDIR /app

COPY --from=builder /app/worker /app/worker

USER app

ENTRYPOINT ["/app/worker"]
