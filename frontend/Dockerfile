FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Build production assets
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

# Expose port 3000 for the SPA
EXPOSE 3000

# Adjust nginx to listen on port 3000 instead of 80
RUN sed -i 's/listen       80;/listen       3000;/' /etc/nginx/conf.d/default.conf

ENTRYPOINT ["/docker-entrypoint.sh"]
