# Getting Started

This guide will help you get the GitHub Repository Management API up and running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **Docker** and **Docker Compose**
- **Git**

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/gguilhermepires/desafio_blue_otter.git
cd desafio_blue_otter
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/github_repos?schema=public"

# Application Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration (comma-separated origins)
CORS_ORIGINS="http://138.197.49.129,http://localhost:5173,http://localhost:8080"

# Logging Configuration
LOG_LEVEL=debug
LOG_RETENTION_DAYS=30

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### 3. Start the Application

#### Option A: Docker Compose (Recommended)

The easiest way to run the application is using Docker Compose:

```bash
docker-compose up -d
```

This will:
- Start a PostgreSQL 16 container
- Start the NestJS API container
- Automatically run database migrations
- Set up health checks and volume persistence

**View logs:**
```bash
docker-compose logs -f
```

**Stop the application:**
```bash
docker-compose down
```

#### Option B: Local Development

If you prefer to run the application locally:

```bash
# Install dependencies
npm install

# Ensure PostgreSQL is running
# Update DATABASE_URL in .env if needed

# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Start the application in development mode
npm run start:dev
```

## Verify Installation

Once the application is running, verify it's working:

### 1. Check the API

```bash
curl http://138.197.49.129
```

You should see: `Hello World!`

### 2. Access Swagger Documentation

Open your browser and navigate to:

```
http://138.197.49.129/api/docs
```

You should see the interactive API documentation.

### 3. Test the API

Sync a GitHub user's repositories:

```bash
curl -X POST http://138.197.49.129/api/repositories/sync/octocat
```

You should get a response like:

```json
{
  "count": 8,
  "timestamp": "2025-01-11T10:00:00.000Z",
  "username": "octocat"
}
```

## Next Steps

Now that you have the API running, here's what you can do next:

1. **Explore the API** - Try out different endpoints using the [Swagger UI](http://138.197.49.129/api/docs)
2. **Read the API Reference** - Learn about all available endpoints in the [API Reference](/api/)
3. **Understand the Architecture** - Dive into the [System Architecture](/architecture)
4. **Start Development** - Check out the [Development Guide](/development)

## Common Issues

### Port Already in Use

If port 3000 or 5432 is already in use:

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change the port in docker-compose.yml
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Reset the database
docker-compose down -v
docker-compose up -d
```

### GitHub Rate Limit

GitHub's unauthenticated API allows 60 requests per hour. If you exceed this:

1. Wait for the rate limit to reset (check the error response for reset time)
2. Consider using a GitHub Personal Access Token (future enhancement)

## Getting Help

- Check the [Troubleshooting Guide](/troubleshooting)
- Review the [API Documentation](/api/)
- Open an issue on [GitHub](https://github.com/gguilhermepires/desafio_blue_otter/issues)
