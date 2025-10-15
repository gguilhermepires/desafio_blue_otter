# Deployment

This guide covers deploying the GitHub Repository Management API to various environments.

## Docker Deployment (Recommended)

### Prerequisites

- Docker Engine 20.x or higher
- Docker Compose 2.x or higher

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/gguilhermepires/desafio_blue_otter.git
cd desafio_blue_otter
```

2. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DB_PASSWORD=your_secure_password

# Application
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://your-domain.com

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# GitHub (optional)
GITHUB_TOKEN=your_github_token
```

3. **Start the application:**
```bash
docker-compose up -d
```

4. **Verify deployment:**
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Test API
curl http://138.197.49.129/api/docs
```

### Docker Compose Configuration

The `docker-compose.yml` includes:

**PostgreSQL Service:**
- PostgreSQL 16 Alpine
- Volume persistence
- Health checks
- Automatic restart

**API Service:**
- Node.js application
- Depends on PostgreSQL health
- Auto-restart on failure
- Network isolation

**Docs Service:**
- VitePress documentation
- Hot reload in development
- Accessible at port 5173

### Container Management

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f postgres
```

**Restart services:**
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart api
```

**Stop services:**
```bash
# Stop but keep data
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove volumes (data loss)
docker-compose down -v
```

**Update application:**
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

## Production Considerations

### Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `DB_PASSWORD` - Database password
- `PORT` - Application port (default: 3000)

**Recommended:**
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `CORS_ORIGINS` - Comma-separated allowed origins
- `GITHUB_TOKEN` - For higher rate limits

**Optional:**
- `THROTTLE_TTL` - Rate limit time window (seconds)
- `THROTTLE_LIMIT` - Max requests per window
- `LOG_RETENTION_DAYS` - Log retention period

### Database Backup

**Manual backup:**
```bash
docker-compose exec postgres pg_dump -U postgres github_repos > backup.sql
```

**Restore from backup:**
```bash
docker-compose exec -T postgres psql -U postgres github_repos < backup.sql
```

**Automated backups with cron:**
```bash
# Add to crontab
0 2 * * * cd /path/to/app && docker-compose exec postgres pg_dump -U postgres github_repos > backups/backup-$(date +\%Y\%m\%d).sql
```

### Reverse Proxy Setup

#### Nginx Example

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
    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to API
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
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

### SSL/TLS Configuration

**Using Let's Encrypt with Certbot:**

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Monitoring Setup

#### Health Check Endpoint

The API includes health checks in docker-compose:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 10s
  timeout: 5s
  retries: 5
```

#### Log Monitoring

Logs are stored in the database and can be queried:

```sql
SELECT * FROM "Log"
WHERE level = 'error'
AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

### Performance Tuning

#### PostgreSQL Optimization

Edit `postgresql.conf` in Docker volume:

```conf
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB

# Connections
max_connections = 100

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200
```

#### Node.js Configuration

Set appropriate environment variables:

```env
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=2048"
```

### Scaling

#### Horizontal Scaling

The application is stateless and can be scaled horizontally:

1. **Load Balancer** - Nginx or cloud load balancer
2. **Multiple API instances** - Scale with Docker Compose or Docker Swarm
3. **Database Read Replicas** - PostgreSQL replication

Example with Docker Compose:

```bash
# Scale API service to 3 instances
docker-compose up -d --scale api=3
```

Example with Docker Swarm:

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml github-api

# Scale API service
docker service scale github-api_api=3
```

#### Database Scaling

For high-traffic scenarios:

- **Connection pooling** - Prisma handles this automatically
- **Read replicas** - Configure separate read-only database
- **Caching layer** - Add Redis for frequently accessed data

## Cloud Deployment

### AWS Deployment

#### Using ECS (Elastic Container Service)

1. **Build and push Docker image:**
```bash
# Build image
docker build -t github-api .

# Tag for ECR
docker tag github-api:latest <account-id>.dkr.ecr.<region>.amazonaws.com/github-api:latest

# Push to ECR
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/github-api:latest
```

2. **Set up RDS PostgreSQL:**
- Create RDS PostgreSQL instance
- Configure security groups
- Note connection string

3. **Create ECS Task Definition:**
- Use Docker image from ECR
- Configure environment variables
- Set CPU and memory limits

4. **Deploy ECS Service:**
- Configure load balancer
- Set up auto-scaling
- Deploy task definition

### Google Cloud Platform

#### Using Cloud Run

```bash
# Build and submit image
gcloud builds submit --tag gcr.io/PROJECT_ID/github-api

# Deploy to Cloud Run
gcloud run deploy github-api \
  --image gcr.io/PROJECT_ID/github-api \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=postgresql://... \
  --allow-unauthenticated
```

### DigitalOcean

#### Using App Platform

1. **Create App:**
- Connect GitHub repository
- Select Docker deployment
- Configure environment variables

2. **Add Database:**
- Create managed PostgreSQL database
- Configure connection in app

3. **Deploy:**
- Automatic deployment on git push
- View logs in dashboard

## Monitoring and Maintenance

### Log Aggregation

Recommended tools:
- **ELK Stack** - Elasticsearch, Logstash, Kibana
- **Loki** - Lightweight log aggregation
- **CloudWatch** - AWS native logging
- **Stackdriver** - GCP native logging

### Application Monitoring

Consider integrating:
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **New Relic** - APM
- **DataDog** - Full-stack monitoring

### Database Monitoring

Monitor:
- Connection pool usage
- Query performance
- Index usage
- Table sizes
- Slow queries

## Troubleshooting

See [Troubleshooting Guide](/troubleshooting) for common deployment issues.

## Next Steps

- [Production Checklist](/production)
- [Security Guidelines](/security)
- [Troubleshooting](/troubleshooting)
- [Architecture Overview](/architecture)
