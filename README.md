# GitHub Repository Management API

A RESTful API built with NestJS for synchronizing, managing, and analyzing GitHub repositories. This API allows you to sync GitHub user repositories to a local database, perform advanced searches, and generate statistical insights.

## Features

- 🔄 **Repository Synchronization** - Sync all public repositories from any GitHub user
- 📋 **List & Pagination** - List user repositories with customizable pagination
- 🔍 **Advanced Search** - Search repositories by keywords across name, description, and language
- 📊 **Statistics** - Generate insights including language distribution, timeline, and top users
- 🔒 **Security** - Rate limiting, CORS configuration, Helmet middleware, input validation
- 📝 **Logging** - Async database logging with 30-day retention and correlation IDs
- 📈 **Monitoring** - Prometheus metrics & Grafana dashboards for observability
- 🐳 **Docker Ready** - Full Docker Compose setup with PostgreSQL
- 📖 **API Documentation** - Interactive Swagger/OpenAPI documentation
- ✅ **Well Tested** - 73% test coverage with unit, integration, and E2E tests

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** [NestJS](https://nestjs.com/)
- **Database:** PostgreSQL 16
- **ORM:** [Prisma](https://www.prisma.io/)
- **Monitoring:** Prometheus + Grafana
- **Containers:** Docker + Docker Compose
- **Documentation:** Swagger/OpenAPI + VitePress
- **Testing:** Jest + Supertest

## Prerequisites

- Node.js 18.x or higher
- Docker and Docker Compose
- Git

## Getting Started

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

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/github_repos?schema=public"

# Application Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration (comma-separated origins)
CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:8080"

# Logging Configuration
LOG_LEVEL=debug
LOG_RETENTION_DAYS=30

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Monitoring - Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
```

### 3. Run with Docker Compose (Recommended)

Start both PostgreSQL and the API:

```bash
docker-compose up -d
```

This will:
- Start a PostgreSQL 16 container on port 5432
- Start the NestJS API container on port 3000
- Start Prometheus on port 9090 for metrics collection
- Start Grafana on port 3001 for visualization dashboards
- Start monitoring exporters (postgres_exporter, node_exporter)
- Automatically run Prisma migrations
- Set up health checks and volume persistence

View logs:

```bash
docker-compose logs -f
```

Stop containers:

```bash
docker-compose down
```

### 4. Run Locally (Alternative)

If you prefer to run without Docker:

```bash
# Install dependencies
npm install

# Start PostgreSQL (you'll need a running PostgreSQL instance)
# Update DATABASE_URL in .env to point to your PostgreSQL instance

# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Start the application
npm run start:dev
```

## API Endpoints

### Repositories

#### Sync User Repositories
```http
POST /api/repositories/sync/:username
```

Syncs all public repositories for a GitHub user to the local database.

**Parameters:**
- `username` (path) - GitHub username (e.g., "octocat")

**Responses:**
- `201` - Repositories synced successfully
- `404` - GitHub user not found
- `429` - GitHub API rate limit exceeded
- `502` - GitHub API request failed

**Example:**
```bash
curl -X POST http://localhost:3000/api/repositories/sync/octocat
```

#### List User Repositories
```http
GET /api/repositories/list/:username?page=1&limit=20
```

Returns a paginated list of repositories for a user, ordered by creation date (newest first).

**Parameters:**
- `username` (path) - GitHub username
- `page` (query, optional) - Page number (default: 1)
- `limit` (query, optional) - Items per page (default: 20)

**Responses:**
- `200` - Repositories retrieved successfully
- `404` - User not found in database

**Example:**
```bash
curl http://localhost:3000/api/repositories/list/octocat?page=1&limit=10
```

#### Search Repositories
```http
GET /api/repositories/search?q=typescript+react&page=1&limit=20
```

Searches repositories by keywords in name, description, and language fields.

**Parameters:**
- `q` (query) - Search keywords (space-separated, OR logic)
- `page` (query, optional) - Page number (default: 1)
- `limit` (query, optional) - Items per page (default: 20)

**Responses:**
- `200` - Search results retrieved successfully
- `400` - Invalid search query

**Example:**
```bash
curl "http://localhost:3000/api/repositories/search?q=typescript+react"
```

### Statistics

#### Get Repository Statistics
```http
GET /api/statistics?user=octocat&topN=10
```

Calculates statistics about repositories. Can be filtered by user or return global statistics.

**Parameters:**
- `user` (query, optional) - Filter by username
- `topN` (query, optional) - Number of top users to return (default: 5, max: 20)

**Response includes:**
- **summary** - Total repositories and users
- **languages** - Repository count by programming language
- **timeline_created_monthly** - Repository creation histogram by month (YYYY-MM)
- **top_users_by_repos** - Top users ranked by repository count (global stats only)

**Example:**
```bash
curl "http://localhost:3000/api/statistics?topN=10"
```

## API Documentation

Interactive Swagger/OpenAPI documentation is available at:

```
http://localhost:3000/api/docs
```

The Swagger UI provides:
- Complete API reference
- Request/response schemas
- Try-it-out functionality
- Example requests and responses

## Monitoring & Observability

The application includes a comprehensive monitoring stack with Prometheus and Grafana for real-time observability.

### Access Monitoring Tools

After starting with `docker-compose up -d`, access:

- **Grafana Dashboards:** http://localhost:3001
  - Default credentials: `admin` / `admin` (change in `.env`)
  - Pre-configured dashboards are automatically provisioned

- **Prometheus Metrics:** http://localhost:9090
  - Raw metrics and query interface
  - Scrapes metrics every 15 seconds

- **Application Metrics:** http://localhost:3000/metrics
  - Prometheus-formatted metrics endpoint

### Available Dashboards

#### 1. API Overview Dashboard
Monitor HTTP request metrics and API performance:
- **Request Rate** - Requests per second by endpoint and status code
- **Response Latency** - p50, p95, p99 percentiles for all endpoints
- **Status Codes** - 2xx success, 4xx client errors, 5xx server errors
- **Error Rate** - Percentage of 5xx errors

#### 2. Business Metrics Dashboard
Track application-specific business operations:
- **Repository Sync Operations** - Success/failure rates and duration
- **Repositories Synced** - Latest sync counts by user
- **Search Performance** - Search rates, results, and duration
- **Statistics Calculations** - Calculation rates and performance
- **GitHub API Requests** - External API call tracking

### Metrics Collected

The application automatically collects and exports the following metrics:

**HTTP Metrics:**
- `http_requests_total` - Counter of all HTTP requests (by method, route, status)
- `http_request_duration_seconds` - Histogram of request durations

**Repository Operations:**
- `repository_sync_total` - Counter of sync operations (by username, status)
- `repository_sync_duration_seconds` - Histogram of sync durations
- `repositories_synced` - Gauge of repositories synced per user
- `repository_searches_total` - Counter of search operations
- `repository_search_duration_seconds` - Histogram of search durations
- `repository_search_results` - Gauge of search result counts

**GitHub API:**
- `github_api_requests_total` - Counter of GitHub API calls (by endpoint, status)
- `github_api_request_duration_seconds` - Histogram of GitHub API call durations

**Statistics:**
- `statistics_calculations_total` - Counter of statistics calculations
- `statistics_calculation_duration_seconds` - Histogram of calculation durations

**Database Metrics (via postgres_exporter):**
- Active connections
- Query performance
- Transaction rates
- Cache hit ratios

**System Metrics (via node_exporter):**
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### Health Checks

The application provides health check endpoints for monitoring:

```bash
# Overall health check
curl http://localhost:3000/health

# Liveness probe (is the app running?)
curl http://localhost:3000/health/live

# Readiness probe (is the app ready to serve traffic?)
curl http://localhost:3000/health/ready
```

Health checks monitor:
- Database connectivity
- Memory usage (heap and RSS)
- Disk storage availability

### Data Retention

- **Prometheus:** Metrics retained for 30 days (configurable in `docker-compose.yml`)
- **Grafana:** Dashboard configurations persisted in Docker volumes

### Customizing Dashboards

You can modify existing dashboards or create new ones:

1. **Via Grafana UI:**
   - Edit dashboards directly in the Grafana interface
   - Save changes to persist them in the database

2. **Via JSON:**
   - Export dashboards as JSON from Grafana
   - Save to `grafana/dashboards/` directory
   - Restart Grafana to auto-provision: `docker-compose restart grafana`

### Monitoring Best Practices

- **Set up alerts** in Grafana for critical metrics (high error rates, slow response times)
- **Monitor trends** over time to identify performance degradation
- **Review dashboards** regularly during development and after deployments
- **Use labels** effectively to filter metrics by user, endpoint, or status
- **Correlate metrics** with logs for faster troubleshooting

## Development

### Available Scripts

```bash
# Development
npm run start           # Start application
npm run start:dev       # Start with watch mode
npm run start:debug     # Start in debug mode

# Building
npm run build           # Build for production
npm run start:prod      # Run production build

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Run tests with coverage
npm run test:e2e        # Run E2E tests

# Code Quality
npm run lint            # Run ESLint
npm run format          # Run Prettier

# Database
npx prisma migrate dev  # Create and apply migration
npx prisma studio       # Open Prisma Studio (DB GUI)
npx prisma generate     # Generate Prisma Client

# Documentation
npm run docs:dev        # Start VitePress dev server
npm run docs:build      # Build VitePress documentation
```

### Database Schema

The application uses three main models:

**User**
- `id` - Auto-increment primary key
- `githubId` - Unique GitHub user ID
- `login` - GitHub username (unique)
- `avatarUrl` - User's avatar URL
- `createdAt`, `updatedAt` - Timestamps

**Repository**
- `id` - Auto-increment primary key
- `githubId` - Unique GitHub repository ID
- `name` - Repository name
- `description` - Repository description (nullable)
- `url` - Repository URL
- `language` - Primary programming language (nullable)
- `createdAt`, `updatedAt` - Timestamps
- `userId` - Foreign key to User

**Log**
- `id` - UUID primary key
- `timestamp` - Log timestamp
- `level` - Log level (DEBUG, INFO, WARN, ERROR)
- `message` - Log message
- `context` - JSON context data
- `stackTrace` - Error stack trace (for errors)
- `metadata` - Additional JSON metadata

View schema:
```bash
cat prisma/schema.prisma
```

## Project Structure

```
desafio_blue_otter/
├── src/
│   ├── common/              # Shared utilities
│   │   ├── dto/             # Common DTOs
│   │   ├── filters/         # Exception filters
│   │   └── interceptors/    # Logging interceptor
│   ├── config/              # Configuration
│   │   └── env.validation.ts
│   ├── modules/
│   │   ├── github/          # GitHub API integration
│   │   ├── logger/          # Logging service
│   │   ├── prisma/          # Prisma service
│   │   ├── repositories/    # Repository endpoints
│   │   ├── statistics/      # Statistics endpoints
│   │   └── users/           # User management
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
├── prisma/
│   ├── migrations/          # Database migrations
│   └── schema.prisma        # Prisma schema
├── test/                    # E2E tests
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Multi-stage Docker build
└── README.md                # This file
```

## Performance Targets

The API is optimized for the following performance benchmarks:

- **List endpoint:** < 2s for 1000 repositories
- **Search endpoint:** < 3s for 10,000 repositories
- **Statistics endpoint:** < 5s for 100,000 repositories
- **Concurrent load:** 100 requests without > 2x degradation

Optimizations include:
- Database indexes on frequently queried fields
- Pagination for large result sets
- Parallel batch processing with Promise.all
- Connection pooling
- Async non-blocking logging

## Security Features

- **Rate Limiting:** 100 requests per minute per IP (configurable)
- **CORS:** Configurable allowed origins via environment variables
- **Helmet:** Security headers middleware
- **Input Validation:** class-validator decorators on all DTOs
- **SQL Injection Prevention:** Prisma parameterized queries
- **Error Sanitization:** Stack traces hidden in production

## Logging

The application implements comprehensive logging:

- **Async Database Logging:** Non-blocking writes to PostgreSQL
- **Structured JSON Format:** Easy parsing and analysis
- **Correlation IDs:** Track requests across the system
- **30-Day Retention:** Automatic cleanup via cron job
- **Log Levels:** DEBUG, INFO, WARN, ERROR (configurable)

## Testing

The project maintains 73% test coverage with:

- **Unit Tests:** Services and business logic
- **Integration Tests:** Controller endpoints
- **E2E Tests:** Complete user flows
- **Mocked Dependencies:** GitHub API responses mocked in tests

Run tests:
```bash
npm run test:cov
```

## Error Handling

Global exception filter handles:

- **HTTP Exceptions:** Validation errors, not found, etc.
- **Prisma Errors:** Database constraint violations
- **GitHub API Errors:** Rate limits, network failures
- **Unknown Errors:** Fallback to 500 Internal Server Error

All errors include:
- Timestamp
- Correlation ID
- Path and method
- Status code
- Error message

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### GitHub API Rate Limiting

GitHub's unauthenticated API allows 60 requests per hour per IP. If you hit the limit:

1. Wait for the rate limit to reset
2. Add a GitHub Personal Access Token (future enhancement)

### Port Already in Use

If port 3000 or 5432 is already in use:

```bash
# Change ports in docker-compose.yml
# Or kill the process using the port
lsof -ti:3000 | xargs kill -9
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the UNLICENSED License.

## Author

Guilherme Pires - [GitHub](https://github.com/gguilhermepires)

## Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [GitHub API](https://docs.github.com/en/rest) - Repository data source
