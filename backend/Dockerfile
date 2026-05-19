# ---- Builder stage ----
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Certificates are needed for fetching modules over HTTPS.
RUN apk add --no-cache ca-certificates git

# Copy module files first for better layer caching.
COPY go.mod go.sum ./
RUN go mod download

# Copy application source.
COPY . .

# Build a static Linux binary for a minimal production image.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /app/youtube-backend ./main.go

# ---- Final runtime stage ----
FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S app \
    && adduser -S -G app -h /app app

WORKDIR /app

COPY --from=builder /app/youtube-backend ./youtube-backend

ENV GO_ENV=production \
    PORT=8080

EXPOSE 8080

USER app

CMD ["./youtube-backend"]
