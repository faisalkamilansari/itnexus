#!/bin/bash

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

print_color "blue" "==== BuopsoIT Docker Setup ===="
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

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
  print_color "red" "Docker daemon is not running. Please start Docker service first."
  print_color "yellow" "On Linux: sudo systemctl start docker"
  print_color "yellow" "On macOS: Open Docker Desktop app"
  print_color "yellow" "On Windows: Start Docker Desktop from the system tray"
  exit 1
fi

# Check if the current directory is accessible
if [ ! -f "docker-compose.yml" ]; then
  print_color "red" "docker-compose.yml not found in the current directory."
  print_color "yellow" "Please run this script from the project root directory."
  exit 1
fi

# Verify permissions
if [ ! -r "docker-compose.yml" ]; then
  print_color "red" "Cannot read docker-compose.yml. Check file permissions."
  exit 1
fi

print_color "green" "✓ Docker and Docker Compose are installed and running"

# Check if .env file exists, if not create it from example
if [ ! -f .env ]; then
  print_color "yellow" "Creating .env file from example..."
  cp .env.example .env
  print_color "yellow" "Please update the .env file with your configuration before continuing."
  print_color "yellow" "At minimum, change the SESSION_SECRET value for security."
  
  # Generate a random SESSION_SECRET
  RANDOM_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
  sed -i "s/buopsoit_change_this_in_production/$RANDOM_SECRET/" .env
  
  print_color "green" "✓ Generated a random SESSION_SECRET in .env"
  print_color "yellow" "Review the .env file and run this script again."
  exit 1
else 
  print_color "green" "✓ Using existing .env file"
fi

# Stop any running containers
print_color "yellow" "Stopping any existing containers..."

# Run docker-compose down with error handling
docker-compose down > docker-compose-down.log 2>&1
DOCKER_COMPOSE_DOWN_EXIT_CODE=$?

if [ $DOCKER_COMPOSE_DOWN_EXIT_CODE -ne 0 ]; then
  print_color "yellow" "Warning: docker-compose down command failed with exit code $DOCKER_COMPOSE_DOWN_EXIT_CODE"
  
  # Check the log for specific error patterns
  if grep -q "No such file or directory" docker-compose-down.log; then
    print_color "yellow" "This is usually not a critical error, continuing with container creation."
    print_color "yellow" "If you continue to have issues, try restarting Docker: sudo systemctl restart docker"
  else
    print_color "yellow" "Docker Compose down error log:"
    cat docker-compose-down.log
  fi
fi

# Clean up log file
rm -f docker-compose-down.log

# Build and start the containers
print_color "yellow" "Building and starting Docker containers..."

# Make sure we're in the right directory before running docker-compose
if [ ! -f "docker-compose.yml" ]; then
  print_color "red" "ERROR: docker-compose.yml not found in current directory!"
  print_color "yellow" "Make sure you're running this script from the project root directory."
  exit 1
fi

# Check for common error conditions
if [ ! -w "." ]; then
  print_color "red" "ERROR: Current directory is not writable!"
  print_color "yellow" "Docker Compose may fail with a 'No such file or directory' error."
  print_color "yellow" "Try running with sudo or fix permissions: sudo chown -R $(whoami) ."
  exit 1
fi

# Try to run docker-compose with error capture
docker-compose up -d --build > docker-compose.log 2>&1
DOCKER_COMPOSE_EXIT_CODE=$?

if [ $DOCKER_COMPOSE_EXIT_CODE -ne 0 ]; then
  print_color "red" "Docker Compose command failed with exit code $DOCKER_COMPOSE_EXIT_CODE"
  
  # Check the log for specific error patterns
  if grep -q "No such file or directory" docker-compose.log; then
    print_color "red" "Detected 'No such file or directory' error."
    print_color "yellow" "This is usually caused by one of the following issues:"
    print_color "yellow" "1. Docker daemon is not running"
    print_color "yellow" "2. Current directory permissions issue"
    print_color "yellow" "3. Docker working directory corruption"
    print_color "yellow" ""
    print_color "yellow" "Try the following fixes:"
    print_color "yellow" "- Restart Docker service: sudo systemctl restart docker"
    print_color "yellow" "- Fix permissions: sudo chown -R $(whoami) ."
    print_color "yellow" "- Run from a different directory: mkdir ~/buopsoit-tmp && cp -r . ~/buopsoit-tmp && cd ~/buopsoit-tmp && ./run-docker.sh"
  fi
  
  # Display the full error log
  print_color "yellow" "Docker Compose error log:"
  cat docker-compose.log
  exit 1
fi

# Clean up log file on success
rm -f docker-compose.log

# Wait for containers to be ready
print_color "yellow" "Waiting for services to be ready..."
attempts=0
max_attempts=30
until docker-compose ps | grep -q "Up" || [ $attempts -eq $max_attempts ]; do
  echo -n "."
  sleep 2
  attempts=$((attempts+1))
done
echo

# Display container status
print_color "blue" "Container status:"
docker-compose ps

# Check container health status more thoroughly
print_color "yellow" "Checking container health status..."

# Check Postgres
postgres_status=$(docker-compose ps postgres | grep -q "Up" && echo "Running" || echo "Not running")
if [ "$postgres_status" == "Running" ]; then
  postgres_health=$(docker inspect --format='{{.State.Health.Status}}' buopsoit-postgres)
  print_color "green" "✓ PostgreSQL: $postgres_status, Health: $postgres_health"
else
  print_color "red" "✗ PostgreSQL: $postgres_status"
  print_color "yellow" "Check PostgreSQL logs with: docker-compose logs postgres"
  print_color "yellow" "You might need to increase startup timeout or fix PostgreSQL configuration."
fi

# Check BuopsoIT app
app_status=$(docker-compose ps buopsoit | grep -q "Up" && echo "Running" || echo "Not running")
if [ "$app_status" == "Running" ]; then
  app_health=$(docker inspect --format='{{.State.Health.Status}}' buopsoit-app 2>/dev/null || echo "No health check")
  print_color "green" "✓ BuopsoIT App: $app_status, Health: $app_health"
  
  # Wait for app container to be fully ready
  attempts=0
  max_attempts=20
  print_color "yellow" "Waiting for BuopsoIT web app to be ready..."
  until curl -s http://localhost:5000 > /dev/null || [ $attempts -eq $max_attempts ]; do
    echo -n "."
    sleep 3
    attempts=$((attempts+1))
  done
  echo
  
  if [ $attempts -lt $max_attempts ]; then
    print_color "green" "✓ Web app is responding"
  else
    print_color "yellow" "! Web app is not responding yet, but container is running. It might still be initializing."
  fi
else
  print_color "red" "✗ BuopsoIT App: $app_status"
  print_color "yellow" "Check the logs with: docker-compose logs buopsoit"
fi

# Verify if postgres is accessible from buopsoit container
if [ "$postgres_status" == "Running" ] && [ "$app_status" == "Running" ]; then
  print_color "yellow" "Verifying database connection from app container..."
  db_check=$(docker exec buopsoit-app bash -c "pg_isready -h postgres -U \$PGUSER" 2>&1)
  if [[ $db_check == *"accepting connections"* ]]; then
    print_color "green" "✓ Database connection verified"
  else
    print_color "red" "✗ Database connection issue: $db_check"
    print_color "yellow" "There might be a network or authentication issue between containers."
  fi
fi

echo
if [ "$postgres_status" == "Running" ] && [ "$app_status" == "Running" ]; then
  print_color "green" "==== BuopsoIT is now running! ===="
  print_color "green" "You can access it at: http://localhost:5000"
  print_color "yellow" "Default login credentials:"
  echo "  Username: admin"
  echo "  Password: admin123"
  print_color "yellow" "IMPORTANT: Change these credentials immediately in a production environment."
  
  # Offer diagnostic tools
  print_color "blue" "Available management commands:"
  echo "  View logs:                  docker-compose logs -f"
  echo "  Run system check:           ./scripts/check-system.sh"
  echo "  Stop the application:       docker-compose down"
  echo "  Restart the application:    docker-compose restart"
  echo "  Remove all data (caution):  docker-compose down -v"
else
  print_color "red" "Something went wrong during container startup."
  print_color "yellow" "Check the logs with: docker-compose logs"
  print_color "yellow" "Run a system check with: ./scripts/check-system.sh"
  print_color "yellow" "For troubleshooting, refer to the README.md troubleshooting section."
fi