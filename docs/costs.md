# Infrastructure Costs

This document provides a comprehensive breakdown of the monthly operational costs for running the GitHub Repository Management API on DigitalOcean Kubernetes.

## Monthly Cost Summary

| Component | Specification | Monthly Cost |
|-----------|--------------|--------------|
| **Kubernetes Node** | s-4vcpu-8gb (4 vCPU, 8GB RAM) × 1 | $48.00 |
| **Load Balancer** | DigitalOcean Load Balancer | $12.00 |
| **Block Storage** | 15Gi total | $1.50 |
| └─ PostgreSQL | 5Gi | $0.50 |
| └─ Kafka | 3Gi | $0.30 |
| └─ Zookeeper | 2Gi | $0.20 |
| └─ Prometheus | 3Gi | $0.30 |
| └─ Grafana | 2Gi | $0.20 |
| **Container Registry** | Starter plan | $5.00 |
| **Total** | | **$66.50/month** |

## Cost Breakdown by Category

### Compute - $48.00/month (72% of total)

**Current Configuration:**
- Node Pool: 1 node
- Node Size: s-4vcpu-8gb
  - 4 vCPU
  - 8GB RAM
  - 160GB SSD
- Region: NYC3

**Resource Allocation:**
- API Application: 100m CPU, 256Mi RAM
- Documentation: 200m CPU, 512Mi RAM
- PostgreSQL: 200m CPU, 512Mi RAM
- Kafka: 250m CPU, 512Mi RAM
- Zookeeper: 100m CPU, 256Mi RAM
- Prometheus: 150m CPU, 384Mi RAM
- Grafana: 100m CPU, 256Mi RAM
- Postgres Exporter: 50m CPU, 64Mi RAM
- Node Exporter: 50m CPU, 64Mi RAM
- Kafka UI: 500m CPU, 512Mi RAM

**Total Requested:** ~1.7 vCPU, ~3.3GB RAM

### Networking - $12.00/month (18% of total)

**Load Balancer:**
- Type: DigitalOcean Managed Load Balancer
- Purpose: Nginx Ingress Controller external access
- Features:
  - Automatic failover
  - Health checks
  - SSL termination capable
  - 1 static IP address

**Traffic Costs:**
- First 1TB outbound: Included
- Additional bandwidth: $0.01/GB

### Storage - $1.50/month (2% of total)

**Block Storage Volumes:**

| Service | Size | Cost | Purpose |
|---------|------|------|---------|
| PostgreSQL | 5Gi | $0.50 | Database storage |
| Kafka | 3Gi | $0.30 | Message queue logs |
| Zookeeper | 2Gi | $0.20 | Kafka coordination |
| Prometheus | 3Gi | $0.30 | Metrics storage (1-day retention) |
| Grafana | 2Gi | $0.20 | Dashboard configurations |
| **Total** | **15Gi** | **$1.50** | |

**Storage Class:** do-block-storage (SSD-based)

### Container Registry - $5.00/month (8% of total)

**DigitalOcean Container Registry:**
- Plan: Starter
- Storage: 5GB
- Bandwidth: 5GB/month
- Images:
  - `github-api:v*` (API application)
  - `github-api-docs:v*` (Documentation)

## Cost Optimization Strategies

### 1. Development Environment ($42.50/month - 36% savings)

For development and testing environments:

| Component | Change | New Cost | Savings |
|-----------|--------|----------|---------|
| Kubernetes Node | s-2vcpu-4gb (2 vCPU, 4GB) | $24.00 | -$24.00 |
| Container Registry | Free tier (500MB) | $0.00 | -$5.00 |
| **Total** | | **$37.50** | **-$24.00** |

### 2. Storage Optimization ($66.20/month - 0.5% savings)

Reduce retention periods for non-critical data:

```yaml
# Prometheus - Reduce retention
--storage.tsdb.retention.time=6h  # Was: 1d
# Save: ~$0.15/month

# Kafka - Reduce retention
KAFKA_LOG_RETENTION_HOURS: "12"  # Was: 24
# Save: ~$0.15/month
```

### 3. Resource Right-Sizing

**Current utilization:**
- CPU: ~21% (1.7/8 vCPU)
- Memory: ~41% (3.3/8 GB)

**Options:**
- ✅ Keep s-4vcpu-8gb for production (room for growth)
- ⚠️ Downgrade to s-2vcpu-4gb for low-traffic staging
- ⚠️ Consider s-2vcpu-2gb for demo environments

### 4. Cluster Scheduling

**Scheduled Shutdown for Development:**
```bash
# Shutdown nights and weekends (128 hours/week)
# Active: 40 hours/week = 24% of time
# Monthly savings: ~$18/month

# Implementation: Use DigitalOcean API + cron
doctl kubernetes cluster delete $CLUSTER_ID  # Friday 6 PM
doctl kubernetes cluster create ...          # Monday 9 AM
```

### 5. Multi-Tenant Architecture

Share infrastructure across multiple applications:

| Apps per Cluster | Cost per App | Savings |
|------------------|--------------|---------|
| 1 | $66.50 | - |
| 2 | $33.75 | 49% |
| 3 | $22.67 | 66% |

*Note: Requires namespace isolation and resource quotas*

## Scaling Cost Impact

### Horizontal Scaling (Within Node)

**No additional cost** for scaling these services within current node capacity:

```bash
# Scale API to 2 replicas
kubectl scale deployment api --replicas=2 -n github-api-dev
# Cost impact: $0

# Scale to 3 replicas (may require larger node)
kubectl scale deployment api --replicas=3 -n github-api-dev
# Cost impact: Depends on available resources
```

### Vertical Node Scaling

| Node Size | vCPU | RAM | Storage | Monthly Cost | Use Case |
|-----------|------|-----|---------|--------------|----------|
| s-1vcpu-2gb | 1 | 2GB | 50GB | $12 | Demo only |
| s-2vcpu-2gb | 2 | 2GB | 60GB | $18 | Minimal dev |
| s-2vcpu-4gb | 2 | 4GB | 80GB | $24 | Development |
| **s-4vcpu-8gb** | **4** | **8GB** | **160GB** | **$48** | **Production** |
| s-8vcpu-16gb | 8 | 16GB | 320GB | $96 | High traffic |
| g-8vcpu-32gb | 8 | 32GB | 320GB | $336 | Memory intensive |

### Multi-Node Cluster

| Configuration | Total Cost | Use Case |
|---------------|------------|----------|
| 1 node (s-4vcpu-8gb) | $66.50/mo | Current production |
| 2 nodes (s-4vcpu-8gb) | $108.00/mo | High availability |
| 3 nodes (s-4vcpu-8gb) | $156.00/mo | HA + rolling updates |
| 3 nodes (s-2vcpu-4gb) | $84.00/mo | HA for lower traffic |

**Notes:**
- Multi-node adds redundancy but increases cost linearly
- Load balancer cost ($12) stays the same
- Storage cost increases if StatefulSets scale

### Storage Scaling

| Storage Size | Monthly Cost | Cost per GB |
|--------------|--------------|-------------|
| 1-100 GB | $0.10/GB | $0.10 |
| 100+ GB | Volume discount | ~$0.08 |

**Example scenarios:**
- Add 10Gi for backups: +$1.00/month
- Increase Postgres to 10Gi: +$0.50/month
- Add 50Gi for logs: +$5.00/month

## Cost Comparison with Alternatives

### Docker Compose on Droplet

| Component | Specification | Monthly Cost |
|-----------|--------------|--------------|
| Droplet | 4GB RAM, 2 vCPU, 80GB | $24.00 |
| Backups | 20% surcharge | $4.80 |
| **Total** | | **$28.80/month** |

**Trade-offs:**
- ✅ 57% cheaper
- ❌ No auto-scaling
- ❌ No load balancing
- ❌ Manual updates
- ❌ Single point of failure

### Managed Services Alternative

| Component | Service | Monthly Cost |
|-----------|---------|--------------|
| Database | Managed PostgreSQL (1GB) | $15.00 |
| App Platform | Professional plan | $12.00 |
| Kafka | Managed Kafka (Basic) | $45.00 |
| Monitoring | External (Datadog) | $15.00 |
| **Total** | | **$87.00/month** |

**Trade-offs:**
- ❌ 31% more expensive
- ✅ Less maintenance
- ✅ Automatic backups
- ✅ Managed updates

### AWS EKS Comparison

| Component | Specification | Monthly Cost |
|-----------|--------------|--------------|
| EKS Control Plane | Managed Kubernetes | $72.00 |
| EC2 Instances | t3.medium × 2 | $60.00 |
| ELB | Application Load Balancer | $16.00 |
| EBS | 15GB gp3 | $1.50 |
| **Total** | | **$149.50/month** |

**Trade-offs:**
- ❌ 125% more expensive
- ✅ Better AWS integration
- ✅ More mature ecosystem
- ⚠️ More complex

### AWS Serverless Architecture

**Estimated for moderate traffic (100K requests/month, ~46 requests/hour average):**

| Component | Service | Specification | Monthly Cost |
|-----------|---------|--------------|--------------|
| **Compute** | Lambda | 128MB RAM, 100K invocations, 1s avg duration | $0.20 |
| **API Gateway** | REST API | 100K requests | $0.35 |
| **Database** | DynamoDB | On-demand, 1GB storage, 100K reads, 50K writes | $1.50 |
| **Storage** | S3 | 5GB storage, 10K requests | $0.15 |
| **Container Registry** | ECR | 5GB storage, 500GB data transfer | $0.50 |
| **Monitoring** | CloudWatch | 10 custom metrics, 5GB logs | $3.00 |
| **Message Queue** | SQS | 100K requests | $0.04 |
| **Data Transfer** | OUT to Internet | 1GB | $0.09 |
| **Total (Low Traffic)** | | | **$5.83/month** |

**Estimated for high traffic (10M requests/month, ~4,630 requests/hour average):**

| Component | Service | Specification | Monthly Cost |
|-----------|---------|--------------|--------------|
| **Compute** | Lambda | 512MB RAM, 10M invocations, 500ms avg duration | $83.50 |
| **API Gateway** | REST API | 10M requests | $35.00 |
| **Database** | DynamoDB | On-demand, 10GB storage, 10M reads, 5M writes | $14.00 |
| **Storage** | S3 | 10GB storage, 1M requests | $0.45 |
| **Container Registry** | ECR | 5GB storage, 500GB data transfer | $0.50 |
| **Monitoring** | CloudWatch | 50 custom metrics, 50GB logs | $27.50 |
| **Message Queue** | SQS | 10M requests | $4.00 |
| **Data Transfer** | OUT to Internet | 100GB | $9.00 |
| **Total (High Traffic)** | | | **$173.95/month** |

**Serverless Components Breakdown:**

1. **AWS Lambda** (Application Logic)
   - Replaces: API pods, background workers
   - Pricing: $0.20 per 1M requests + $0.0000166667 per GB-second
   - Free tier: 1M requests/month, 400K GB-seconds
   - Best for: Variable workloads, event-driven architecture

2. **API Gateway** (HTTP API)
   - Replaces: Nginx Ingress, Load Balancer
   - Pricing: $3.50 per million requests (REST API)
   - HTTP API: $1.00 per million requests (cheaper alternative)
   - Features: Authentication, rate limiting, caching

3. **DynamoDB** (Database)
   - Replaces: PostgreSQL
   - On-demand pricing: $1.25 per million writes, $0.25 per million reads
   - Storage: $0.25/GB/month
   - Free tier: 25GB storage, 25 WCU, 25 RCU

4. **Amazon S3** (Object Storage)
   - Replaces: File storage, static assets
   - Pricing: $0.023/GB/month
   - Requests: $0.0004 per 1K GET, $0.005 per 1K PUT

5. **Amazon ECR** (Container Registry)
   - Storage: $0.10/GB/month
   - Data transfer: $0.09/GB (out to internet)

6. **Amazon SQS** (Message Queue)
   - Replaces: Kafka + Zookeeper
   - Pricing: $0.40 per million requests
   - Free tier: 1M requests/month

7. **CloudWatch** (Monitoring)
   - Replaces: Prometheus + Grafana
   - Metrics: $0.30 per custom metric
   - Logs: $0.50/GB ingested, $0.03/GB stored
   - Dashboards: $3/dashboard/month

**Serverless Trade-offs:**

**Advantages:**
- ✅ Pay only for actual usage (not idle capacity)
- ✅ Auto-scaling built-in (0 to millions of requests)
- ✅ No infrastructure management
- ✅ 91-99% cheaper at low traffic
- ✅ High availability by default
- ✅ No cold starts with provisioned concurrency (additional cost)

**Disadvantages:**
- ❌ Cold start latency (100-500ms for first request)
- ❌ 15-minute Lambda timeout limit
- ❌ More expensive at very high consistent traffic
- ❌ Vendor lock-in
- ❌ Complex debugging and monitoring
- ❌ DynamoDB requires data model redesign (NoSQL vs PostgreSQL)

**Cost Comparison Summary:**

| Traffic Level | Current (DO K8s) | AWS Serverless | Savings |
|---------------|------------------|----------------|---------|
| Low (100K req/mo) | $66.50 | $5.83 | 91% cheaper |
| Medium (1M req/mo) | $66.50 | $28.50 | 57% cheaper |
| High (10M req/mo) | $108.00 | $173.95 | 61% more expensive |
| Very High (100M req/mo) | $300.00 | $1,450.00 | 383% more expensive |

**When to Choose Serverless:**
- Variable/unpredictable traffic patterns
- Low to medium traffic applications
- Event-driven architecture
- Rapid prototyping and MVP development
- Cost optimization priority

**When to Keep Kubernetes:**
- High consistent traffic (>5M requests/month)
- Long-running processes (>15 minutes)
- Complex stateful applications
- Need for specific runtime environments
- Multi-cloud or hybrid strategy

## Monthly Cost Projections

### Growth Scenarios

**Low Growth (10 requests/sec):**
- Configuration: Current (1 node, s-4vcpu-8gb)
- Cost: $66.50/month

**Medium Growth (100 requests/sec):**
- Configuration: 2 nodes (s-4vcpu-8gb), API scaled to 3 replicas
- Cost: $108.00/month (+62%)

**High Growth (1000 requests/sec):**
- Configuration: 3 nodes (s-8vcpu-16gb), API scaled to 6 replicas
- Cost: $300.00/month (+351%)

**Additional Costs at Scale:**
- CDN (DigitalOcean Spaces): ~$5/month
- Managed Database: ~$15-60/month
- Additional monitoring: ~$10-20/month

## Cost Monitoring and Alerts

### Setting Up Billing Alerts

```bash
# Using DigitalOcean CLI
doctl billing alert create \
  --threshold 70 \
  --email your-email@example.com

# Set budget alerts at:
# - $50 (75% of expected)
# - $66 (100% of expected)
# - $80 (120% - investigation needed)
```

### Monthly Cost Review Checklist

- [ ] Review DigitalOcean billing dashboard
- [ ] Check actual vs. projected costs
- [ ] Analyze resource utilization
- [ ] Identify unused resources
- [ ] Review storage growth
- [ ] Check bandwidth usage
- [ ] Evaluate scaling needs

### Cost Attribution

**By Service Type:**
- Application layer (API, Docs, Kafka UI): ~$0.50/month (shared compute)
- Data layer (Postgres, Kafka, Zookeeper): ~$1.00/month (storage)
- Monitoring (Prometheus, Grafana): ~$0.50/month (storage)
- Infrastructure (compute, networking): ~$60.00/month
- Registry: ~$5.00/month

**By Environment:**
- Production: $66.50/month
- Staging: $37.50/month (recommended)
- Development: $28.80/month (local Docker Compose)

## Additional Resources

- [DigitalOcean Pricing](https://www.digitalocean.com/pricing)
- [Kubernetes Cost Optimization](https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/)
- [DigitalOcean Cost Estimation Tool](https://cloud.digitalocean.com/billing)

## Summary

The current production deployment costs **$66.50/month** with the following distribution:
- 72% Compute (Kubernetes nodes)
- 18% Networking (Load balancer)
- 8% Registry (Container images)
- 2% Storage (Persistent volumes)

This provides a production-grade infrastructure with monitoring, high availability capabilities, and room for 3-4x growth without additional nodes.
