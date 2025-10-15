# Production Checklist

Complete checklist for deploying the GitHub Repository Management API to production.

## Pre-Deployment

### Configuration

- [ ] Environment variables configured in `.env`
- [ ] Strong database password (16+ characters)
- [ ] GitHub token with minimal scopes
- [ ] CORS restricted to production domains
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=info` or `warn`
- [ ] Appropriate rate limiting configured
- [ ] Log retention days set (recommended: 30)

### Security

- [ ] All sensitive data in environment variables
- [ ] No secrets committed to git
- [ ] SSL/TLS certificates configured
- [ ] Reverse proxy configured (Nginx/Apache)
- [ ] Security headers enabled (Helmet)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Database user has minimal privileges
- [ ] Firewall rules configured

### Database

- [ ] PostgreSQL 16 installed/configured
- [ ] Database migrations run
- [ ] Database backups scheduled
- [ ] Connection pooling configured
- [ ] Database performance tuned
- [ ] Indexes verified
- [ ] Maintenance jobs scheduled

### Infrastructure

- [ ] Docker and Docker Compose installed
- [ ] Sufficient disk space (20GB+ recommended)
- [ ] Sufficient RAM (2GB+ recommended)
- [ ] Monitoring tools installed
- [ ] Log aggregation configured
- [ ] Health checks configured
- [ ] Auto-restart on failure enabled

### Code Quality

- [ ] All tests passing
- [ ] Test coverage > 70%
- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] Dependencies audited (`npm audit`)
- [ ] Dependencies up to date
- [ ] Code reviewed

## Deployment Steps

### 1. Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Create application directory
sudo mkdir -p /opt/github-api
sudo chown $USER:$USER /opt/github-api
```

### 2. Clone Repository

```bash
cd /opt/github-api
git clone https://github.com/gguilhermepires/desafio_blue_otter.git .
```

### 3. Configure Environment

```bash
# Create production .env file
nano .env
```

**Production `.env` example:**
```env
# Database
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@postgres:5432/github_repos"
DB_PASSWORD=your_very_secure_production_password_here

# Application
PORT=3000
NODE_ENV=production

# CORS - Replace with your domains
CORS_ORIGINS="https://yourdomain.com,https://api.yourdomain.com"

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# GitHub
GITHUB_TOKEN=ghp_your_production_token_here
```

### 4. Deploy with Docker Compose

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Verify Deployment

```bash
# Test API endpoint
curl http://138.197.49.129/api/docs

# Check health
docker-compose ps

# View container logs
docker-compose logs api
```

### 6. Configure Reverse Proxy

**Nginx configuration:**

```bash
sudo nano /etc/nginx/sites-available/github-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/github-api-access.log;
    error_log /var/log/nginx/github-api-error.log;

    # Proxy to application
    location / {
        proxy_pass http://138.197.49.129;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/github-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Configure SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Test renewal
sudo certbot renew --dry-run
```

## Post-Deployment

### Monitoring Setup

**1. Application Monitoring:**

```bash
# Check application logs
docker-compose logs -f api

# Check database logs
docker-compose logs -f postgres

# Monitor resource usage
docker stats
```

**2. System Monitoring:**

```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Check disk usage
df -h

# Check memory
free -h

# Check system load
uptime
```

**3. Database Monitoring:**

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('github_repos'));

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity
WHERE datname = 'github_repos';
```

### Backup Setup

**1. Database Backups:**

```bash
# Create backup directory
sudo mkdir -p /opt/backups/github-api
sudo chown $USER:$USER /opt/backups/github-api

# Create backup script
nano /opt/backups/backup-database.sh
```

**backup-database.sh:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/github-api"
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Create backup
docker-compose -f /opt/github-api/docker-compose.yml \
  exec -T postgres pg_dump -U postgres github_repos | gzip > "$BACKUP_FILE"

# Keep only last 30 days
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

Make executable:
```bash
chmod +x /opt/backups/backup-database.sh
```

**2. Schedule Backups:**

```bash
# Add to crontab
crontab -e
```

Add line:
```
0 2 * * * /opt/backups/backup-database.sh >> /var/log/github-api-backup.log 2>&1
```

**3. Test Restore:**

```bash
# Test restore process
gunzip -c /opt/backups/github-api/backup_latest.sql.gz | \
  docker-compose exec -T postgres psql -U postgres github_repos
```

### Automated Updates

**Create update script:**

```bash
nano /opt/github-api/update.sh
```

**update.sh:**
```bash
#!/bin/bash
set -e

echo "Starting update process..."

# Pull latest code
git pull origin main

# Stop services
docker-compose down

# Rebuild images
docker-compose build --no-cache

# Run migrations
docker-compose run --rm api npx prisma migrate deploy

# Start services
docker-compose up -d

# Check health
sleep 10
docker-compose ps

echo "Update completed successfully!"
```

Make executable:
```bash
chmod +x /opt/github-api/update.sh
```

### Log Rotation

**Configure log rotation:**

```bash
sudo nano /etc/logrotate.d/github-api
```

```
/var/log/nginx/github-api-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

## Performance Tuning

### PostgreSQL

**Edit postgresql.conf:**

```conf
# Memory
shared_buffers = 256MB          # 25% of RAM
effective_cache_size = 1GB      # 50-75% of RAM
work_mem = 10MB
maintenance_work_mem = 64MB

# Connections
max_connections = 100

# Performance
random_page_cost = 1.1          # For SSD
effective_io_concurrency = 200  # For SSD
```

### Node.js

**Environment variables:**

```env
NODE_OPTIONS="--max-old-space-size=2048"
UV_THREADPOOL_SIZE=4
```

### Nginx

```nginx
# Worker processes
worker_processes auto;
worker_connections 1024;

# Gzip compression
gzip on;
gzip_types text/plain application/json;
gzip_min_length 1000;

# Caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m;
```

## Scaling

### Vertical Scaling

**Upgrade server resources:**
- Increase RAM (recommended: 4GB+)
- Add CPU cores
- Use SSD for database
- Increase disk space

### Horizontal Scaling

**Docker Compose Scaling:**

```bash
# Scale API service to 3 instances
docker-compose up -d --scale api=3
```

**Load balancer with Nginx:**
```nginx
upstream api_backend {
    least_conn;
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    location / {
        proxy_pass http://api_backend;
    }
}
```

## Maintenance

### Regular Tasks

**Daily:**
- [ ] Check application logs
- [ ] Monitor error rates
- [ ] Verify backups completed

**Weekly:**
- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Review security logs
- [ ] Update dependencies

**Monthly:**
- [ ] Review and archive logs
- [ ] Security audit
- [ ] Performance tuning
- [ ] Capacity planning

### Update Procedures

```bash
# 1. Backup database
/opt/backups/backup-database.sh

# 2. Test in staging
# (if you have staging environment)

# 3. Schedule maintenance window

# 4. Run update script
/opt/github-api/update.sh

# 5. Verify deployment
curl https://api.yourdomain.com/api/docs

# 6. Monitor for issues
docker-compose logs -f --tail=100
```

## Rollback Plan

If deployment fails:

```bash
# 1. Stop current version
docker-compose down

# 2. Checkout previous version
git checkout <previous-commit>

# 3. Restore database backup (if needed)
gunzip -c /opt/backups/github-api/backup_<timestamp>.sql.gz | \
  docker-compose exec -T postgres psql -U postgres github_repos

# 4. Start services
docker-compose up -d

# 5. Verify
curl http://138.197.49.129/api/docs
```

## Troubleshooting

See [Troubleshooting Guide](/troubleshooting) for common issues and solutions.

## Support

For production support:
- Monitor logs: `docker-compose logs -f`
- Check status: `docker-compose ps`
- Restart services: `docker-compose restart`
- Full restart: `docker-compose down && docker-compose up -d`

## Next Steps

- [Troubleshooting](/troubleshooting)
- [Security Guidelines](/security)
- [Monitoring Setup](/deployment#monitoring-setup)
- [Backup Procedures](/deployment#database-backup)
