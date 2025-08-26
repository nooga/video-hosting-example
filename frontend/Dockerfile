# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
# Build without specific environment variables - we'll inject them at runtime
RUN npm run build

# Production stage: serve with nginx
FROM nginx:alpine

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy the built app
COPY --from=build /app/build /usr/share/nginx/html

# Create a startup script that will generate runtime config
RUN cat <<'EOF' > /docker-entrypoint.sh
#!/bin/sh

# Default values
REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:8080}
REACT_APP_MINIO_URL=${REACT_APP_MINIO_URL:-http://localhost:9000}

# Generate runtime config file
cat <<CONFIG_EOF > /usr/share/nginx/html/runtime-config.js
window.ENV = {
  REACT_APP_API_URL: '$REACT_APP_API_URL',
  REACT_APP_MINIO_URL: '$REACT_APP_MINIO_URL'
};
CONFIG_EOF

echo "Generated runtime config:"
cat /usr/share/nginx/html/runtime-config.js

# Start nginx
exec nginx -g "daemon off;"
EOF

RUN chmod +x /docker-entrypoint.sh

# Create nginx config
RUN cat <<'EOF' > /etc/nginx/nginx.conf
worker_processes 1;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen 3000;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # Handle static assets
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Handle runtime config
        location /runtime-config.js {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        
        # Handle React routing
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
EOF

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
