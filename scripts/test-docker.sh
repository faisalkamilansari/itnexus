#!/bin/bash
set -e

# Function to print colored text
function print_color() {
  local color=$1
  local text=$2
  
  case $color in
    "red")
      echo -e "\033[31m$text\033[0m"
      ;;
    "green")
      echo -e "\033[32m$text\033[0m"
      ;;
    "yellow")
      echo -e "\033[33m$text\033[0m"
      ;;
    "blue")
      echo -e "\033[34m$text\033[0m"
      ;;
    *)
      echo "$text"
      ;;
  esac
}

print_color "blue" "==== Testing BuopsoIT Docker Setup ===="
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  print_color "red" "Docker is not installed. Please install Docker first."
  exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
  print_color "red" "Docker Compose is not installed. Please install Docker Compose first."
  exit 1
fi

print_color "green" "✓ Docker and Docker Compose are installed"

# Verify Dockerfile exists
if [ ! -f "Dockerfile" ]; then
  print_color "red" "Dockerfile is missing."
  exit 1
fi

# Verify docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
  print_color "red" "docker-compose.yml is missing."
  exit 1
fi

# Verify docker-entrypoint.sh exists
if [ ! -f "docker-entrypoint.sh" ]; then
  print_color "red" "docker-entrypoint.sh is missing."
  exit 1
fi

# Verify .env.example exists
if [ ! -f ".env.example" ]; then
  print_color "red" ".env.example is missing."
  exit 1
fi

# Verify init-container.js exists
if [ ! -f "scripts/init-container.js" ]; then
  print_color "red" "scripts/init-container.js is missing."
  exit 1
fi

print_color "green" "✓ All required Docker files are present"
echo

# Create test .env file
cp .env.example .env.test
print_color "green" "✓ Created test environment file"

# Build the Docker image (without starting containers)
print_color "yellow" "Building Docker image (this may take a few minutes)..."
if ! docker-compose -f docker-compose.yml --env-file .env.test build --no-cache 2>/tmp/docker-build-error.log; then
  print_color "red" "Docker build failed. See error log below:"
  cat /tmp/docker-build-error.log
  rm .env.test
  exit 1
fi

print_color "green" "✓ Docker image built successfully"
echo

# Clean up
print_color "yellow" "Cleaning up test files..."
rm .env.test
print_color "green" "✓ Test files removed"
echo

print_color "green" "==== Docker setup test completed successfully! ===="
print_color "yellow" "To run the application with Docker, use:"
echo "./run-docker.sh"
echo