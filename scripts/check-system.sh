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

print_color "blue" "==== BuopsoIT System Check ===="
echo

# Check system requirements
print_color "yellow" "Checking system requirements..."

# Check Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  print_color "green" "✓ Node.js is installed: $NODE_VERSION"
else
  print_color "red" "✗ Node.js is not installed"
  FAILED=true
fi

# Check npm
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  print_color "green" "✓ npm is installed: $NPM_VERSION"
else
  print_color "red" "✗ npm is not installed"
  FAILED=true
fi

# Check Docker if available
if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  print_color "green" "✓ Docker is installed: $DOCKER_VERSION"
else
  print_color "yellow" "i Docker is not installed (only needed for containerized deployment)"
fi

# Check Docker Compose if available
if command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE_VERSION=$(docker-compose --version)
  print_color "green" "✓ Docker Compose is installed: $DOCKER_COMPOSE_VERSION"
else
  print_color "yellow" "i Docker Compose is not installed (only needed for containerized deployment)"
fi

# Check PostgreSQL if available
if command -v psql &> /dev/null; then
  PSQL_VERSION=$(psql --version)
  print_color "green" "✓ PostgreSQL client is installed: $PSQL_VERSION"
else
  print_color "yellow" "i PostgreSQL client is not installed (not required for Docker deployment)"
fi

echo

# Check environment files
print_color "yellow" "Checking environment files..."

if [ -f ".env.example" ]; then
  print_color "green" "✓ .env.example exists"
else
  print_color "red" "✗ .env.example file is missing"
  FAILED=true
fi

if [ -f ".env" ]; then
  print_color "green" "✓ .env exists"
else
  print_color "yellow" "i .env file is missing (will be created automatically by run-docker.sh)"
fi

echo

# Check Docker files
print_color "yellow" "Checking Docker files..."

if [ -f "Dockerfile" ]; then
  print_color "green" "✓ Dockerfile exists"
else
  print_color "red" "✗ Dockerfile is missing"
  FAILED=true
fi

if [ -f "docker-compose.yml" ]; then
  print_color "green" "✓ docker-compose.yml exists"
else
  print_color "red" "✗ docker-compose.yml is missing"
  FAILED=true
fi

if [ -f "docker-entrypoint.sh" ]; then
  if [ -x "docker-entrypoint.sh" ]; then
    print_color "green" "✓ docker-entrypoint.sh exists and is executable"
  else
    print_color "yellow" "! docker-entrypoint.sh exists but is not executable"
    chmod +x docker-entrypoint.sh
    print_color "green" "✓ Made docker-entrypoint.sh executable"
  fi
else
  print_color "red" "✗ docker-entrypoint.sh is missing"
  FAILED=true
fi

if [ -f ".dockerignore" ]; then
  print_color "green" "✓ .dockerignore exists"
else
  print_color "yellow" "! .dockerignore is missing"
fi

echo

# Check scripts
print_color "yellow" "Checking scripts..."

if [ -f "scripts/init-container.js" ]; then
  print_color "green" "✓ scripts/init-container.js exists"
else
  print_color "red" "✗ scripts/init-container.js is missing"
  FAILED=true
fi

if [ -f "scripts/db-docker.js" ]; then
  print_color "green" "✓ scripts/db-docker.js exists"
else
  print_color "red" "✗ scripts/db-docker.js is missing"
  FAILED=true
fi

if [ -f "scripts/init-db-docker.js" ]; then
  print_color "green" "✓ scripts/init-db-docker.js exists"
else
  print_color "red" "✗ scripts/init-db-docker.js is missing"
  FAILED=true
fi

if [ -f "run-docker.sh" ]; then
  if [ -x "run-docker.sh" ]; then
    print_color "green" "✓ run-docker.sh exists and is executable"
  else
    print_color "yellow" "! run-docker.sh exists but is not executable"
    chmod +x run-docker.sh
    print_color "green" "✓ Made run-docker.sh executable"
  fi
else
  print_color "red" "✗ run-docker.sh is missing"
  FAILED=true
fi

echo

# Check database if environment variables exist
if [ -n "$DATABASE_URL" ] || [ -n "$PGHOST" ]; then
  print_color "yellow" "Checking database connection..."
  
  # Create a temporary script to check the database
  cat > /tmp/check-db.js <<EOL
import pg from 'pg';
const { Pool } = pg;

const config = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE || 'postgres'
    };

const pool = new Pool(config);

async function checkDatabase() {
  try {
    // Test connection
    const client = await pool.connect();
    const timeResult = await client.query('SELECT NOW() as time');
    console.log(\`✅ Database connection successful. Server time: \${timeResult.rows[0].time}\`);
    
    // Check tables
    const tablesResult = await client.query(\`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    \`);
    
    if (tablesResult.rows.length > 0) {
      console.log(\`✅ Database contains \${tablesResult.rows.length} tables:\`);
      tablesResult.rows.forEach(row => {
        console.log(\`   - \${row.table_name}\`);
      });
      
      // Check tenants
      const tenantsResult = await client.query(\`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'tenants'
        )
      \`);
      
      if (tenantsResult.rows[0].exists) {
        const tenantCountResult = await client.query('SELECT COUNT(*) FROM tenants');
        console.log(\`✅ Found \${tenantCountResult.rows[0].count} tenants in the database\`);
        
        // Check column names format (camelCase vs snake_case)
        const columnCheckResult = await client.query(\`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users'
          ORDER BY column_name
        \`);
        
        console.log('✅ Column names in users table:');
        const hasCamelCase = columnCheckResult.rows.some(row => 
          row.column_name.includes('Id') || 
          row.column_name.includes('Name') || 
          row.column_name === 'tenantId' ||
          row.column_name === 'firstName' ||
          row.column_name === 'lastName' ||
          row.column_name === 'createdAt'
        );
        
        const hasSnakeCase = columnCheckResult.rows.some(row => 
          row.column_name.includes('_id') || 
          row.column_name.includes('_name') ||
          row.column_name === 'tenant_id' ||
          row.column_name === 'first_name' ||
          row.column_name === 'last_name' ||
          row.column_name === 'created_at'
        );
        
        columnCheckResult.rows.forEach(row => {
          console.log(\`   - \${row.column_name}\`);
        });
        
        if (hasCamelCase) {
          console.log('✅ Using camelCase column naming convention (e.g., tenantId)');
        } else if (hasSnakeCase) {
          console.log('✅ Using snake_case column naming convention (e.g., tenant_id)');
        } else {
          console.log('⚠️ Unable to determine column naming convention');
        }
      }
    } else {
      console.log('❌ No tables found in the database. Schema initialization may be required.');
    }
    
    client.release();
  } catch (err) {
    console.error(\`❌ Database connection error: \${err.message}\`);
    if (err.code === 'ECONNREFUSED') {
      console.error('   Make sure the database server is running and accessible.');
    } else if (err.code === '28P01') {
      console.error('   Authentication failed. Check your database credentials.');
    } else if (err.code === '3D000') {
      console.error('   Database does not exist. Make sure it has been created.');
    } else if (err.code === '42P01') {
      console.error('   Relation does not exist. Schema initialization may have failed.');
    } else if (err.code === '42703') {
      console.error('   Column does not exist. There might be case sensitivity issues with column names.');
      console.error('   Docker uses snake_case (tenant_id) while development might use camelCase (tenantId).');
    }
  } finally {
    await pool.end();
  }
}

checkDatabase();
EOL

  # Run the database check script
  NODE_OUTPUT=$(node --input-type=module /tmp/check-db.js 2>&1)
  echo "$NODE_OUTPUT" | while read -r line; do
    if [[ $line == *"❌"* ]]; then
      print_color "red" "$line"
    elif [[ $line == *"✅"* ]]; then
      print_color "green" "$line"
    elif [[ $line == *"⚠️"* ]]; then
      print_color "yellow" "$line"
    else
      echo "$line"
    fi
  done
  
  # Remove temporary file
  rm /tmp/check-db.js
  
  echo
fi

# Check if we're already running in Docker
if [ -f "/.dockerenv" ]; then
  print_color "blue" "Running inside Docker container"
  print_color "yellow" "Checking container health..."
  
  # Check available memory
  MEMORY=$(free -h | grep Mem | awk '{print $2}')
  print_color "green" "✓ Available memory: $MEMORY"
  
  # Check CPU info
  CPU_COUNT=$(grep -c ^processor /proc/cpuinfo)
  print_color "green" "✓ Available CPUs: $CPU_COUNT"
  
  # Check disk space
  DISK_SPACE=$(df -h | grep -E '/$' | awk '{print $4}')
  print_color "green" "✓ Available disk space: $DISK_SPACE"
  
  echo
fi

# Summary
if [ "$FAILED" = true ]; then
  print_color "red" "==== System check completed with issues ====";
  print_color "yellow" "Please fix the issues above before proceeding.";
else
  print_color "green" "==== System check completed successfully ====";
  print_color "green" "Your system is ready to run BuopsoIT!";
  print_color "blue" "To run with Docker, use:";
  echo "  ./run-docker.sh";
  print_color "blue" "To run in development mode:";
  echo "  npm install";
  echo "  npm run dev";
fi