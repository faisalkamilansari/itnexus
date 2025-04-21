# Use Node.js as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install PostgreSQL client tools for database initialization and migrations
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Make the entrypoint script executable
RUN chmod +x ./docker-entrypoint.sh

# Build the application
RUN npm run build

# Update the database connection for Docker environment
RUN cp -f server/db-docker.js dist/db.js

# Environment variables
ENV NODE_ENV=production \
    PORT=5000 \
    DOCKER_CONTAINER=true \
    SESSION_SECRET=${SESSION_SECRET:-buopsoit_default_session_secret}

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Use the entrypoint script to initialize the database and start the application
ENTRYPOINT ["./docker-entrypoint.sh"]