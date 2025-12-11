# ---- Builder stage ----
FROM golang:1.23-alpine AS builder

# Install build dependencies (no FFmpeg needed for backend API)
RUN apk add --no-cache git ca-certificates tzdata build-base

# Set working directory
WORKDIR /app

# Copy go module files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build backend binary for linux; enable CGO to satisfy any driver needs
RUN CGO_ENABLED=1 GOOS=linux go build -o youtube-backend ./main.go

# ---- Final runtime stage ----
FROM alpine:latest

# Install runtime dependencies (minimal; no FFmpeg here)
RUN apk --no-cache add ca-certificates tzdata

# Minimal, non-root runtime user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/youtube-backend ./youtube-backend

# Environment configuration
ENV PORT=8080

# Expose the backend port
EXPOSE 8080

# Run as non-root user
USER app

# Command to run backend API
CMD ["./youtube-backend"]
