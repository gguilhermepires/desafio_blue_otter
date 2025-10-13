# Configuration

Complete guide to configuring the GitHub Repository Management API.

## Environment Variables

All configuration is managed through environment variables defined in a `.env` file.

### Creating Configuration File

```bash
# Copy example file
cp .env.example .env

# Edit with your settings
nano .env
```

## Configuration Reference

### Database Configuration

#### DATABASE_URL

PostgreSQL connection string.

**Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
```

**Example:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/github_repos?schema=public"
```

**Docker Compose:**
```env
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@postgres:5432/github_repos?schema=public"
```

**Components:**
- `user`: Database username (default: `postgres`)
- `password`: Database password
- `host`: Database host (use `postgres` in Docker, `localhost` for local)
- `port`: Database port (default: `5432`)
- `database`: Database name (default: `github_repos`)
- `schema`: Schema name (default: `public`)

#### DB_PASSWORD

Database password (used in docker-compose.yml).

**Example:**
```env
DB_PASSWORD=your_secure_password_here
```

**Security:**
- Use strong passwords in production
- Never commit passwords to git
- Rotate passwords regularly

---

### Application Configuration

#### PORT

Port number for the API server.

**Default:** `3000`

**Example:**
```env
PORT=3000
```

**Range:** 1024-65535 (use non-privileged ports)

#### NODE_ENV

Application environment.

**Values:**
- `development` - Development mode, verbose logging
- `production` - Production mode, optimized performance
- `test` - Testing mode

**Default:** `development`

**Example:**
```env
NODE_ENV=production
```

**Impact:**
- Affects error detail exposure
- Influences logging verbosity
- Changes optimization levels

---

### CORS Configuration

#### CORS_ORIGINS

Comma-separated list of allowed origins for CORS.

**Default:** `http://localhost:3000,http://localhost:5173,http://localhost:8080`

**Example:**
```env
CORS_ORIGINS="https://app.example.com,https://dashboard.example.com"
```

**Local Development:**
```env
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
```

**Production:**
```env
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

**Notes:**
- No trailing slashes
- Include protocol (http:// or https://)
- Separate multiple origins with commas (no spaces)

---

### Logging Configuration

#### LOG_LEVEL

Minimum log level to output.

**Values:**
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - Info, warnings, and errors
- `debug` - All logs including debug info

**Default:** `info`

**Example:**
```env
LOG_LEVEL=info
```

**Recommendations:**
- Development: `debug`
- Staging: `info`
- Production: `info` or `warn`

#### LOG_RETENTION_DAYS

Number of days to retain logs in database.

**Default:** `30`

**Example:**
```env
LOG_RETENTION_DAYS=30
```

**Range:** 1-365

**Storage Considerations:**
- Higher retention = more storage used
- Adjust based on compliance requirements
- Consider archiving old logs

---

### Rate Limiting Configuration

#### THROTTLE_TTL

Time window in seconds for rate limiting.

**Default:** `60`

**Example:**
```env
THROTTLE_TTL=60
```

**Meaning:** Rate limit window is 60 seconds

#### THROTTLE_LIMIT

Maximum requests per TTL window per IP address.

**Default:** `100`

**Example:**
```env
THROTTLE_LIMIT=100
```

**Recommendations:**
- Development: `1000` (relaxed)
- Production: `100` (balanced)
- High security: `50` (strict)

**Calculation:**
```
Requests per minute = THROTTLE_LIMIT (if THROTTLE_TTL=60)
Requests per hour = THROTTLE_LIMIT * (3600 / THROTTLE_TTL)
```

**Examples:**
```env
# 100 requests per minute
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# 50 requests per 30 seconds (100/min)
THROTTLE_TTL=30
THROTTLE_LIMIT=50

# 200 requests per 2 minutes
THROTTLE_TTL=120
THROTTLE_LIMIT=200
```

---

### GitHub API Configuration

#### GITHUB_TOKEN

GitHub Personal Access Token for API access.

**Optional** - If not provided, unauthenticated requests are made.

**Example:**
```env
GITHUB_TOKEN=ghp_your_token_here
```

**Benefits:**
- Higher rate limits (5000/hour vs 60/hour)
- Access to additional endpoints
- More reliable for production

**Creating Token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scope: `public_repo` (read access)
4. Copy token to `.env`

**Security:**
- Never commit tokens to git
- Use token with minimal required scopes
- Rotate tokens periodically

---

## Configuration Examples

### Local Development

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/github_repos?schema=public"
DB_PASSWORD=postgres

# Application
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:8080"

# Logging
LOG_LEVEL=debug
LOG_RETENTION_DAYS=7

# Rate Limiting (relaxed for development)
THROTTLE_TTL=60
THROTTLE_LIMIT=1000

# GitHub (optional)
# GITHUB_TOKEN=ghp_your_token_here
```

### Production (Docker)

```env
# Database
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@postgres:5432/github_repos?schema=public"
DB_PASSWORD=your_secure_production_password

# Application
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# GitHub
GITHUB_TOKEN=ghp_your_production_token
```

### Testing

```env
# Database (separate test database)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/github_repos_test?schema=public"
DB_PASSWORD=postgres

# Application
PORT=3001
NODE_ENV=test

# CORS
CORS_ORIGINS="http://localhost:3001"

# Logging (minimal)
LOG_LEVEL=error
LOG_RETENTION_DAYS=1

# Rate Limiting (disabled for testing)
THROTTLE_TTL=1
THROTTLE_LIMIT=100000

# GitHub (use test token)
GITHUB_TOKEN=ghp_test_token
```

## Configuration Validation

The application validates configuration on startup:

```typescript
// Required variables
DATABASE_URL   // Must be valid PostgreSQL connection string
PORT           // Must be valid port number

// Optional with defaults
NODE_ENV       // Defaults to 'development'
LOG_LEVEL      // Defaults to 'info'
THROTTLE_TTL   // Defaults to 60
THROTTLE_LIMIT // Defaults to 100
```

**Startup Errors:**

Missing required variable:
```
Error: Configuration validation failed
Missing required environment variable: DATABASE_URL
```

Invalid value:
```
Error: Configuration validation failed
Invalid PORT: must be a number between 1024 and 65535
```

## Docker Configuration

### docker-compose.yml

Environment variables are passed from `.env` automatically:

```yaml
services:
  api:
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/github_repos
      NODE_ENV: production
      PORT: 3000
      CORS_ORIGINS: ${CORS_ORIGINS}
      LOG_LEVEL: ${LOG_LEVEL}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
```

### Build-time vs Runtime

**Build-time variables:**
- Not used in this project
- Would be set with `ARG` in Dockerfile

**Runtime variables:**
- All configuration is runtime
- Set via `.env` file
- Can be overridden with `docker-compose run -e VAR=value`

## Security Best Practices

### Sensitive Data

Never commit to git:
- `.env` - Already in `.gitignore`
- Database passwords
- GitHub tokens
- Any API keys

### Production Checklist

- [ ] Strong database password (16+ chars, mixed case, numbers, symbols)
- [ ] GitHub token with minimal scopes
- [ ] CORS limited to specific domains
- [ ] Appropriate rate limits
- [ ] LOG_LEVEL set to `info` or `warn`
- [ ] Regular credential rotation schedule

### Environment-specific Files

```
.env                  # Local development (gitignored)
.env.example          # Template (committed)
.env.production       # Production (never commit)
.env.staging          # Staging (never commit)
```

## Troubleshooting

### Database Connection Failed

**Error:** `Can't reach database server`

**Solutions:**
- Verify `DATABASE_URL` format
- Check database is running
- Test connection: `psql $DATABASE_URL`
- Ensure network connectivity

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solutions:**
- Change `PORT` in `.env`
- Kill process using port: `lsof -ti:3000 | xargs kill -9`
- Use different port number

### CORS Errors

**Error:** `Access blocked by CORS policy`

**Solutions:**
- Add origin to `CORS_ORIGINS`
- Include protocol (http:// or https://)
- No trailing slashes
- Restart server after changes

## Next Steps

- [Getting Started](/getting-started)
- [Development Guide](/development)
- [Deployment](/deployment)
- [Troubleshooting](/troubleshooting)
