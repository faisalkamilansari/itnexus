# BuopsoIT - Multi-tenant ITSM SaaS Platform

BuopsoIT is a comprehensive multi-tenant SaaS platform focused on IT Service Management (ITSM). The platform provides core ITSM functionalities including incident management, service requests, change management, asset management, monitoring, and reporting capabilities for multiple organizations in a secure, isolated environment.

## Features

- **Multi-tenant architecture** - Complete data isolation between tenants
- **Incident Management** - Track and manage IT incidents efficiently
- **Service Request Management** - Streamline service request fulfillment
- **Change Management** - Control the change process in your IT environment
- **Asset Management** - Track IT assets throughout their lifecycle
- **Monitoring & Alerts** - Stay informed about system health and issues
- **Reporting & Analytics** - Data-driven insights for better decision making
- **Service Catalog** - Standardized service offerings

## Technology Stack

- **Frontend**: React.js with TypeScript, Shadcn UI components, Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based authentication
- **Containerization**: Docker and Docker Compose

## Running with Docker

### PostgreSQL Compatibility Notes

When running in Docker with PostgreSQL, the initialization scripts use lowercase column names (snake_case) instead of camelCase for better PostgreSQL compatibility. This affects the following column names:

| Drizzle Schema (camelCase) | PostgreSQL Docker (snake_case) |
|---------------------------|-------------------------------|
| tenantId                  | tenant_id                     |
| firstName                 | first_name                    |
| lastName                  | last_name                     |
| createdAt                 | created_at                    |

The application code transparently handles these naming differences through the ORM layer.

### Prerequisites

- Docker and Docker Compose installed on your system
- Git to clone the repository

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/buopsoit.git
   cd buopsoit
   ```

2. Run the helper script to set up and start the application:
   ```bash
   ./run-docker.sh
   ```

   The script will:
   - Create a .env file from .env.example if it doesn't exist
   - Build and start the Docker containers
   - Display container status
   - Provide the URL to access the application

3. Access the application at http://localhost:5000

### Default Credentials

The application is initialized with a default tenant and admin user:

- **Username**: admin
- **Password**: admin123

**Important**: Change these credentials immediately in a production environment.

### Manual Setup

If you prefer to set up manually instead of using the helper script:

1. Create a .env file by copying the example:
   ```bash
   cp .env.example .env
   ```

2. Edit the .env file to customize your environment variables

3. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

4. Check the container status:
   ```bash
   docker-compose ps
   ```

5. Access the application at http://localhost:5000

### Environment Variables

Key environment variables you might want to customize:

- `SESSION_SECRET`: Secret key for session encryption (change this in production)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`: Database credentials
- `PORT`: The port the application will run on (default: 5000)

See the .env.example file for a complete list of environment variables.

## Development Setup

If you prefer to run the application without Docker for development:

1. Install Node.js (v18+) and npm
2. Install PostgreSQL and create a database
3. Set up environment variables (copy .env.example to .env and modify)
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run database migrations:
   ```bash
   npm run db:push
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

## License

[MIT License](LICENSE)

## Troubleshooting

### Docker Database Issues

If you encounter database-related issues when running in Docker:

1. Check the container logs:
   ```bash
   docker-compose logs -f app
   ```

2. Verify the PostgreSQL container is running:
   ```bash
   docker-compose logs -f postgres
   ```

3. Run the system check script to diagnose common issues:
   ```bash
   ./scripts/check-system.sh
   ```

4. If the database initialization fails, you can rebuild the containers:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```
   Note: The `-v` flag removes volumes, which will erase any existing data.

5. For persistent schema issues, check the PostgreSQL compatibility notes in the Docker section above.

### Docker Compose Errors

If you encounter the following error with Docker Compose:
```
FileNotFoundError: [Errno 2] No such file or directory
```

This typically indicates one of these issues:

1. **Docker daemon is not running**. Start the Docker service:
   ```bash
   sudo systemctl start docker  # on Linux
   ```
   On macOS/Windows, start Docker Desktop.

2. **Working directory issues**. Make sure:
   - You're running commands from the project root directory
   - The directory exists and is accessible
   - The user has read/write permissions to the directory

3. **Docker working directory corruption**. Can be fixed by:
   ```bash
   # Stop all containers
   docker-compose down
   
   # Restart Docker service
   sudo systemctl restart docker  # on Linux
   
   # Try running again
   ./run-docker.sh
   ```

4. **Docker accessing a deleted working directory**. This can happen if the Docker Compose command is running in a directory that was moved or deleted. Try these solutions:

   ```bash
   # Solution 1: Copy project to a fresh directory
   mkdir ~/buopsoit-fresh
   cp -r /path/to/original/project/* ~/buopsoit-fresh/
   cd ~/buopsoit-fresh
   ./run-docker.sh
   
   # Solution 2: Reset Docker environment
   sudo systemctl stop docker
   sudo rm -rf /var/lib/docker/containers/*
   sudo systemctl start docker
   
   # Solution 3: If using Docker Desktop, restart it completely
   ```

5. **Docker Context Issues**: If you're using Docker contexts, make sure you're in the correct context:
   ```bash
   # List contexts
   docker context ls
   
   # Switch to default context
   docker context use default
   ```

### Recovering from Docker Directory Issues

If you continue to experience the "FileNotFoundError" with Docker Compose, you can use this process to recover your installation:

1. **Create a clean Docker environment**:

   ```bash
   # Stop Docker service
   sudo systemctl stop docker
   
   # Backup Docker data (optional, if you have other important containers)
   sudo cp -r /var/lib/docker /var/lib/docker.backup
   
   # Reset Docker data
   sudo rm -rf /var/lib/docker/containers/*
   sudo rm -rf /var/lib/docker/overlay2/*
   
   # Start Docker service
   sudo systemctl start docker
   ```

2. **Create a fresh installation directory**:

   ```bash
   # Create a new directory
   mkdir -p ~/buopsoit-clean-install
   
   # Copy all project files, preserving permissions
   cp -rp /path/to/original/project/* ~/buopsoit-clean-install/
   
   # Navigate to the new directory
   cd ~/buopsoit-clean-install
   
   # Make the run script executable
   chmod +x ./run-docker.sh
   
   # Run Docker setup
   ./run-docker.sh
   ```

3. **Verify the installation**:

   ```bash
   # Check system health
   ./scripts/check-system.sh
   
   # Check container logs
   docker-compose logs
   ```

## Support

For support, please open an issue on the GitHub repository or contact support@buopsoit.com.