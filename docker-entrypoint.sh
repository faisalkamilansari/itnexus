#!/bin/bash
set -e

# Increase max attempts for initialization
MAX_ATTEMPTS=20
ATTEMPT=0

# Enable more verbose output for debugging
set -x

# Function for better error reporting
report_error() {
  echo "================================================================"
  echo "ERROR: $1"
  echo "----------------------------------------------------------------"
  echo "Current environment variables (sanitized):"
  echo "PGHOST: $PGHOST"
  echo "PGPORT: $PGPORT"
  echo "PGUSER: $PGUSER"
  echo "PGDATABASE: $PGDATABASE"
  echo "----------------------------------------------------------------"
  echo "Attempting to verify database connection..."
  pg_isready -h $PGHOST -p $PGPORT -U $PGUSER || echo "Database connection failed"
  echo "================================================================"
}

echo "Waiting for PostgreSQL to be ready..."
# Wait for PostgreSQL to be ready
until pg_isready -h $PGHOST -p $PGPORT -U $PGUSER
do
  echo "Waiting for PostgreSQL at ${PGHOST}:${PGPORT}..."
  sleep 2
  
  ATTEMPT=$((ATTEMPT+1))
  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    report_error "Failed to connect to PostgreSQL after $MAX_ATTEMPTS attempts."
    
    # Try to check Docker container status for more diagnostics
    echo "Attempting to get container information..."
    hostname
    ip addr
    
    echo "Checking PostgreSQL logs if accessible..."
    if [ -f "/var/log/postgresql/postgresql.log" ]; then
      tail -30 /var/log/postgresql/postgresql.log
    else
      echo "PostgreSQL logs not found at standard location."
    fi
    
    exit 1
  fi
done
echo "PostgreSQL is ready!"

# Reset counter for next operation
ATTEMPT=0

# Compile all scripts first
echo "Compiling initialization scripts..."
mkdir -p dist/scripts
npx esbuild scripts/db-docker.js --platform=node --packages=external --bundle --format=esm --outfile=dist/scripts/db-docker.js
npx esbuild scripts/init-db-docker.js --platform=node --packages=external --bundle --format=esm --outfile=dist/scripts/init-db-docker.js
npx esbuild scripts/init-container.js --platform=node --packages=external --bundle --format=esm --outfile=dist/scripts/init-container.js

# Initialize database schema with retry logic
echo "Initializing database schema..."
until node ./dist/scripts/init-db-docker.js
do
  echo "Database schema initialization failed. Retrying in 5 seconds..."
  sleep 5
  
  ATTEMPT=$((ATTEMPT+1))
  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    report_error "Failed to initialize database schema after $MAX_ATTEMPTS attempts."
    
    # Try to diagnose what's happening with the database
    echo "Checking database tables..."
    PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "\dt" || echo "Failed to list tables"
    
    # Try to get more information
    echo "Checking if tenants table exists..."
    PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tenants'" || echo "Failed to check tenants table"
    
    exit 1
  fi
done
echo "Database schema initialized successfully."

# Reset counter for next operation
ATTEMPT=0

# Initialize container data with retry logic
echo "Initializing default tenant and admin user..."
until node ./dist/scripts/init-container.js
do
  echo "Container initialization failed. Retrying in 5 seconds..."
  sleep 5
  
  ATTEMPT=$((ATTEMPT+1))
  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    report_error "Failed to initialize container after $MAX_ATTEMPTS attempts."
    
    # Try to diagnose what's happening with the tenant table
    echo "Checking tenants table content..."
    PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "SELECT * FROM tenants LIMIT 5" || echo "Failed to query tenants table"
    
    # Check users table
    echo "Checking users table content..."
    PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "SELECT id, username, email, tenant_id, role FROM users LIMIT 5" || echo "Failed to query users table"
    
    exit 1
  fi
done
echo "Container initialization completed successfully."

# Start the application
echo "Starting BuopsoIT application..."
exec npm start