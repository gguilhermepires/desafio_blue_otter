# Troubleshooting

Common issues and solutions for the GitHub Repository Management API.

## Quick Diagnostics

```bash
# Check if services are running
docker-compose ps

# View recent logs
docker-compose logs --tail=50

# Check API health
curl http://138.197.49.129/api/docs

# Check database connection
docker-compose exec postgres psql -U postgres -d github_repos -c "SELECT 1"
```

## Application Issues

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. **Kill process using port:**
```bash
lsof -ti:3000 | xargs kill -9
```

2. **Change port:**
```bash
# Edit .env
PORT=3001

# Restart
docker-compose down
docker-compose up -d
```

3. **Find what's using the port:**
```bash
lsof -i:3000
```

---

### Application Won't Start

**Symptoms:**
- Container exits immediately
- No response from API

**Diagnostics:**

```bash
# Check container status
docker-compose ps

# View full logs
docker-compose logs api

# Check for errors
docker-compose logs api | grep -i error
```

**Common Causes:**

1. **Missing environment variables:**
```bash
# Check .env file exists
ls -la .env

# Verify required variables
grep DATABASE_URL .env
```

2. **Build errors:**
```bash
# Rebuild from scratch
docker-compose build --no-cache api
docker-compose up -d
```

3. **Port conflicts:**
```bash
# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Changed from 3000:3000
```

---

### Module Not Found

**Error:**
```
Error: Cannot find module '@nestjs/core'
```

**Solutions:**

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or in Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

### High Memory Usage

**Symptoms:**
- Slow response times
- Container crashes
- Out of memory errors

**Diagnostics:**

```bash
# Check container memory
docker stats

# Check Node.js memory
docker-compose exec api node -e "console.log(process.memoryUsage())"
```

**Solutions:**

1. **Increase Node.js memory:**
```env
# In .env
NODE_OPTIONS="--max-old-space-size=2048"
```

2. **Optimize queries:**
```typescript
// Use select to limit fields
const repos = await prisma.repository.findMany({
  select: { id: true, name: true, owner: true }
});
```

3. **Implement pagination:**
```typescript
// Always paginate large datasets
const repos = await prisma.repository.findMany({
  take: 20,
  skip: (page - 1) * 20
});
```

## Database Issues

### Connection Failed

**Error:**
```
Error: Can't reach database server at `postgres:5432`
```

**Diagnostics:**

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"
```

**Solutions:**

1. **Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

2. **Check DATABASE_URL:**
```bash
# Verify format
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# For Docker Compose, use service name:
DATABASE_URL="postgresql://postgres:password@postgres:5432/github_repos"
```

3. **Reset database:**
```bash
docker-compose down -v  # Warning: Deletes data
docker-compose up -d
```

---

### Migration Failed

**Error:**
```
Error: P3009: Migration failed to apply
```

**Solutions:**

1. **Check migration status:**
```bash
npx prisma migrate status
```

2. **Reset migrations:**
```bash
npx prisma migrate reset --force
```

3. **Apply manually:**
```bash
# Connect to database
docker-compose exec postgres psql -U postgres github_repos

# Check _prisma_migrations table
SELECT * FROM "_prisma_migrations";

# Mark as applied
UPDATE "_prisma_migrations" SET rolled_back_at = NULL WHERE migration_name = 'xxx';
```

---

### Database Too Large

**Symptoms:**
- Disk full errors
- Slow queries
- High disk usage

**Diagnostics:**

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('github_repos'));

-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
```

**Solutions:**

1. **Clean old logs:**
```sql
DELETE FROM "Log" WHERE timestamp < NOW() - INTERVAL '30 days';
VACUUM FULL "Log";
```

2. **Archive old data:**
```sql
-- Create archive table
CREATE TABLE "Repository_Archive" AS
SELECT * FROM "Repository"
WHERE "createdAt" < NOW() - INTERVAL '1 year';

-- Delete archived data
DELETE FROM "Repository"
WHERE "createdAt" < NOW() - INTERVAL '1 year';

-- Vacuum
VACUUM FULL "Repository";
```

3. **Increase disk space:**
```bash
# Check disk usage
df -h

# Add volume or increase size
```

## Docker Issues

### Container Keeps Restarting

**Diagnostics:**

```bash
# Check restart count
docker-compose ps

# View crash logs
docker-compose logs api | tail -100

# Check exit code
docker-compose ps api
```

**Solutions:**

1. **Fix application errors:**
```bash
# Review logs for errors
docker-compose logs api | grep -i error

# Test locally
npm run start:dev
```

2. **Disable auto-restart temporarily:**
```yaml
# docker-compose.yml
services:
  api:
    restart: "no"  # Change from "always"
```

---

### Cannot Remove Container

**Error:**
```
Error: cannot remove container: container is running
```

**Solutions:**

```bash
# Stop all services
docker-compose down

# Force remove
docker-compose rm -f

# Or remove specific container
docker rm -f github_api
```

---

### Docker Compose Version Issues

**Error:**
```
ERROR: Version in "./docker-compose.yml" is unsupported
```

**Solutions:**

```bash
# Check Docker Compose version
docker-compose --version

# Update Docker Compose
sudo apt install docker-compose-plugin

# Or use newer syntax
docker compose up -d  # Note: no hyphen
```

---

### Out of Disk Space

**Error:**
```
Error: No space left on device
```

**Diagnostics:**

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Check volumes
docker volume ls
```

**Solutions:**

```bash
# Clean up Docker
docker system prune -a --volumes

# Remove unused volumes
docker volume prune

# Remove old images
docker image prune -a
```

## API Issues

### 404 Not Found

**Error:**
```json
{
  "statusCode": 404,
  "message": "Cannot GET /api/endpoint"
}
```

**Solutions:**

1. **Check endpoint exists:**
```bash
# View available routes
curl http://138.197.49.129/api/docs
```

2. **Verify base path:**
```bash
# Correct
curl http://138.197.49.129/api/repositories/list/octocat

# Incorrect (missing /api)
curl http://138.197.49.129/repositories/list/octocat
```

---

### 429 Too Many Requests

**Error:**
```json
{
  "statusCode": 429,
  "message": "Too Many Requests"
}
```

**Solutions:**

1. **Wait for rate limit reset:**
```bash
# Check retry-after header
curl -I http://138.197.49.129/api/endpoint
```

2. **Adjust rate limits:**
```env
# In .env
THROTTLE_TTL=60
THROTTLE_LIMIT=200  # Increased from 100
```

3. **Use GitHub token:**
```env
GITHUB_TOKEN=ghp_your_token_here
```

---

### Slow Response Times

**Symptoms:**
- API takes > 2 seconds to respond
- Timeouts
- High CPU usage

**Diagnostics:**

```bash
# Check response time
time curl http://138.197.49.129/api/repositories/list/octocat

# Monitor resources
docker stats

# Check database connections
docker-compose exec postgres psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='github_repos'"
```

**Solutions:**

1. **Add database indexes:**
```sql
-- Check missing indexes
SELECT tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
ORDER BY abs(correlation) DESC;

-- Add index if needed
CREATE INDEX idx_repository_field ON "Repository"(field);
```

2. **Optimize queries:**
```typescript
// Use select to limit fields
const repos = await prisma.repository.findMany({
  select: {
    id: true,
    name: true,
    owner: true
  },
  take: 20
});
```

3. **Implement caching:**
```typescript
// Cache frequently accessed data
// (requires additional implementation)
```

## GitHub API Issues

### Rate Limit Exceeded

**Error:**
```json
{
  "statusCode": 429,
  "message": "GitHub API rate limit exceeded"
}
```

**Solutions:**

1. **Use authentication:**
```env
GITHUB_TOKEN=ghp_your_personal_access_token
```

2. **Check rate limit status:**
```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/rate_limit
```

3. **Wait for reset:**
```bash
# Check reset time in error response
# Wait until specified time
```

---

### User Not Found

**Error:**
```json
{
  "statusCode": 404,
  "message": "GitHub user 'username' not found"
}
```

**Solutions:**

1. **Verify username on GitHub:**
```bash
curl https://api.github.com/users/username
```

2. **Check for typos:**
```bash
# Case-sensitive
curl http://138.197.49.129/api/repositories/sync/OctoCat  # Wrong
curl http://138.197.49.129/api/repositories/sync/octocat  # Correct
```

---

### GitHub API Down

**Error:**
```json
{
  "statusCode": 502,
  "message": "Bad Gateway"
}
```

**Solutions:**

1. **Check GitHub Status:**
```bash
# Visit https://www.githubstatus.com/
curl https://www.githubstatus.com/api/v2/status.json
```

2. **Implement retry logic:**
```typescript
// Add exponential backoff
// Wait and retry automatically
```

3. **Use cached data:**
```bash
# List cached repositories
curl http://138.197.49.129/api/repositories/list/username
```

## CORS Issues

**Error:**
```
Access to fetch at 'http://138.197.49.129/api/...' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Solutions:**

1. **Add origin to whitelist:**
```env
# In .env
CORS_ORIGINS="http://138.197.49.129,http://localhost:5173"
```

2. **Restart server:**
```bash
docker-compose restart api
```

3. **Verify CORS headers:**
```bash
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -I http://138.197.49.129/api/repositories/list/octocat
```

## Logging Issues

### No Logs Appearing

**Diagnostics:**

```bash
# Check log level
grep LOG_LEVEL .env

# View logs
docker-compose logs api

# Check database logs
docker-compose exec postgres psql -U postgres -d github_repos \
  -c "SELECT * FROM \"Log\" ORDER BY timestamp DESC LIMIT 10"
```

**Solutions:**

1. **Adjust log level:**
```env
LOG_LEVEL=debug  # Show all logs
```

2. **Check LoggerService:**
```bash
# Verify logger is being used
grep -r "LoggerService" src/
```

---

### Log Table Too Large

**Solutions:**

```sql
-- Clean old logs
DELETE FROM "Log"
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Vacuum
VACUUM FULL "Log";

-- Update retention setting
```

```env
LOG_RETENTION_DAYS=7  # Reduced from 30
```

## Getting Help

### Collect Debug Information

```bash
# Create debug report
cat > debug-report.txt << EOF
=== System Info ===
$(uname -a)

=== Docker Version ===
$(docker --version)
$(docker-compose --version)

=== Container Status ===
$(docker-compose ps)

=== Recent Logs ===
$(docker-compose logs --tail=50)

=== Environment (redacted) ===
NODE_ENV: $NODE_ENV
LOG_LEVEL: $LOG_LEVEL
PORT: $PORT

=== Disk Space ===
$(df -h)

=== Memory ===
$(free -h)
EOF

# Remove sensitive data from debug-report.txt before sharing
```

### Where to Get Help

- **Documentation:** Check relevant docs pages
- **GitHub Issues:** Search or create issue
- **Logs:** Always include relevant log excerpts
- **Correlation IDs:** Use for tracing requests

## Next Steps

- [Configuration Guide](/configuration)
- [Deployment Guide](/deployment)
- [Security Guidelines](/security)
- [Development Guide](/development)
