# Kubernetes Deployment Guide

This guide covers deploying the GitHub Repository Management API to a Kubernetes cluster on DigitalOcean using Terraform and kubectl.

## Introduction

The GitHub Repository Management API is deployed on a production-grade Kubernetes infrastructure with the following components:

- **API Application** - NestJS REST API
- **Documentation** - VitePress documentation site
- **Database** - PostgreSQL 16 with persistent storage
- **Message Queue** - Kafka with Zookeeper for asynchronous operations
- **Monitoring Stack** - Prometheus, Grafana, and exporters
- **Management UIs** - Kafka UI for message queue monitoring

All services are exposed through Nginx Ingress Controller on a single IP address with path-based routing.

## Why Kubernetes?

Kubernetes provides:
- **High Availability** - Automatic container restart and health monitoring
- **Scalability** - Easy horizontal scaling of stateless services
- **Resource Management** - Efficient CPU and memory allocation
- **Service Discovery** - Built-in DNS and load balancing
- **Rolling Updates** - Zero-downtime deployments
- **Persistent Storage** - Managed volumes for stateful applications

## Prerequisites

Before deploying, ensure you have:

1. **DigitalOcean Account** with an API token
   - Create at: https://cloud.digitalocean.com/account/api/tokens

2. **Required Tools:**
   ```bash
   # Terraform (1.0+)
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/

   # DigitalOcean CLI (doctl)
   cd ~
   wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
   tar xf doctl-1.104.0-linux-amd64.tar.gz
   sudo mv doctl /usr/local/bin

   # kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

   # Verify installations
   terraform version
   doctl version
   kubectl version --client
   ```

3. **Authentication:**
   ```bash
   # Authenticate doctl
   doctl auth init
   # Enter your DigitalOcean API token when prompted

   # Verify authentication
   doctl account get
   ```

## Infrastructure Overview

### Architecture Diagram

```mermaid
graph TB
    subgraph Internet
        Client[Client/Browser]
    end

    subgraph "DigitalOcean Cloud"
        LB[Load Balancer<br/>138.197.49.129]

        subgraph "Kubernetes Cluster - github-api-dev"
            Ingress[Nginx Ingress Controller]

            subgraph "Application Layer"
                API[API Deployment<br/>NestJS]
                Docs[Docs Deployment<br/>VitePress]
                KafkaUI[Kafka UI Deployment]
            end

            subgraph "Data Layer"
                Postgres[PostgreSQL StatefulSet<br/>5Gi Storage]
                Kafka[Kafka StatefulSet<br/>3Gi Storage]
                Zoo[Zookeeper StatefulSet<br/>2Gi Storage]
            end

            subgraph "Monitoring Layer"
                Prom[Prometheus StatefulSet<br/>3Gi Storage]
                Graf[Grafana Deployment<br/>2Gi Storage]
                PgExp[Postgres Exporter]
                NodeExp[Node Exporter DaemonSet]
            end
        end
    end

    Client -->|HTTP| LB
    LB --> Ingress
    Ingress -->|/| API
    Ingress -->|/docs| Docs
    Ingress -->|/grafana| Graf
    Ingress -->|/prometheus| Prom
    Ingress -->|/kafka-ui| KafkaUI
    Ingress -->|/api/docs| API

    API --> Postgres
    API --> Kafka
    Kafka --> Zoo

    Prom --> API
    Prom --> PgExp
    Prom --> NodeExp
    PgExp --> Postgres
    Graf --> Prom
    KafkaUI --> Kafka
```

### Component Descriptions

#### Application Components

**API Service (api)**
- NestJS application serving REST API
- 1 replica (scalable horizontally)
- Resource limits: 100m CPU, 256Mi memory
- Health checks: `/health` and `/health/ready`
- Image: `registry.digitalocean.com/github-api/github-api:v1.0.5`

**Documentation Service (docs)**
- VitePress documentation site
- 1 replica
- Resource limits: 200m CPU, 512Mi memory
- Serves at `/docs` path

#### Data Components

**PostgreSQL (postgres)**
- StatefulSet with 1 replica
- PostgreSQL 16 Alpine image
- 5Gi persistent storage (do-block-storage)
- Resource limits: 200m CPU, 512Mi memory
- Liveness/readiness probes with `pg_isready`

**Kafka (kafka)**
- StatefulSet with 1 replica
- Wurstmeister Kafka image
- 3Gi persistent storage
- Topics: `repository.sync.request`, `repository.sync.result`
- 24-hour retention policy
- Resource limits: 250m CPU, 512Mi memory

**Zookeeper (zookeeper)**
- StatefulSet with 1 replica
- Confluent Zookeeper image
- 2Gi persistent storage
- Coordinates Kafka cluster
- Resource limits: 100m CPU, 256Mi memory

#### Monitoring Components

**Prometheus (prometheus)**
- StatefulSet with 1 replica
- 3Gi persistent storage
- 1-day retention, 2GB size limit
- Scrapes: API metrics, Postgres, Node metrics
- Resource limits: 150m CPU, 384Mi memory
- Accessible at `/prometheus`

**Grafana (grafana)**
- Deployment with 1 replica
- 2Gi persistent storage
- Pre-configured dashboards:
  - API Overview
  - Business Metrics
- Prometheus datasource configured
- Resource limits: 100m CPU, 256Mi memory
- Accessible at `/grafana`

**Postgres Exporter (postgres-exporter)**
- Deployment with 1 replica
- Exports PostgreSQL metrics to Prometheus
- Resource limits: 50m CPU, 64Mi memory

**Node Exporter (node-exporter)**
- DaemonSet (runs on all nodes)
- Exports node-level system metrics
- Resource limits: 50m CPU, 64Mi memory

**Kafka UI (kafka-ui)**
- Deployment with 1 replica
- Web interface for Kafka management
- Resource limits: 500m CPU, 512Mi memory
- Accessible at `/kafka-ui`

### Storage Configuration

All stateful components use **DigitalOcean Block Storage** (`do-block-storage`):
- Postgres: 5Gi
- Kafka: 3Gi
- Zookeeper: 2Gi
- Prometheus: 3Gi
- Grafana: 2Gi

**Total Storage:** 15Gi

## Monthly Cost Breakdown

The DigitalOcean Kubernetes deployment has the following monthly costs:

### Infrastructure Costs

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

### Cost Optimization Tips

1. **Development Environment**: Use the s-2vcpu-4gb node ($24/month) to reduce costs by 50% for non-production workloads
2. **Storage Optimization**:
   - Reduce Prometheus retention from 1 day to 6 hours: save $0.15/month
   - Reduce Kafka retention from 24 hours to 12 hours: save $0.15/month
3. **Registry**: Use the free tier if image storage is under 500MB
4. **Scheduling**: Use DigitalOcean's scheduled scaling to shut down development clusters during off-hours
5. **Multi-tenant**: Deploy multiple applications to the same cluster to share infrastructure costs

### Scaling Cost Impact

**Horizontal Pod Scaling** (no additional cost):
- Scaling API, Docs, Grafana deployments uses existing node resources

**Vertical Node Scaling**:
- s-2vcpu-4gb: $24/month (development)
- s-4vcpu-8gb: $48/month (production - current)
- s-8vcpu-16gb: $96/month (high traffic)

**Multi-Node Cluster**:
- 2 nodes: $96/month + $12 LB = $108/month
- 3 nodes: $144/month + $12 LB = $156/month

**Additional Storage**:
- Each additional 10Gi: $1.00/month

### Network Configuration

**Cluster Configuration:**
- Region: `nyc1` (New York 1)
- Kubernetes Version: `1.31.1-do.4`
- Node Pool: 1 node, `s-2vcpu-4gb` (2 vCPU, 4GB RAM)
- Namespace: `github-api-dev`

**Service Types:**
- All services use `ClusterIP` (internal only)
- External access via Nginx Ingress Controller
- Single load balancer IP: `138.197.49.129`

## Step-by-Step Deployment

### Step 1: Prepare Environment Variables

Create a file to store your DigitalOcean token and secrets:

```bash
# Create terraform.tfvars (DO NOT COMMIT)
cat > terraform/terraform.tfvars <<EOF
do_token = "your_digitalocean_api_token_here"
EOF

# Verify .gitignore excludes this file
grep -q "terraform.tfvars" .gitignore || echo "terraform.tfvars" >> .gitignore
```

### Step 2: Configure Kubernetes Secrets

Create a secrets file with your actual credentials:

```bash
# Copy the template
cp terraform/kubernetes/01-secrets.yaml terraform/kubernetes/01-secrets-prod.yaml

# Edit with your actual secrets (IMPORTANT: Never commit this file!)
nano terraform/kubernetes/01-secrets-prod.yaml
```

Update the following values in `01-secrets-prod.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: github-api-dev
type: Opaque
stringData:
  POSTGRES_PASSWORD: "your_secure_password_here"
  DATABASE_URL: "postgresql://postgres:your_secure_password_here@postgres:5432/github_repos"

---
apiVersion: v1
kind: Secret
metadata:
  name: api-secret
  namespace: github-api-dev
type: Opaque
stringData:
  GITHUB_TOKEN: "ghp_your_github_personal_access_token"
  DB_PASSWORD: "your_secure_password_here"

---
apiVersion: v1
kind: Secret
metadata:
  name: grafana-secret
  namespace: github-api-dev
type: Opaque
stringData:
  GF_SECURITY_ADMIN_USER: "admin"
  GF_SECURITY_ADMIN_PASSWORD: "your_secure_grafana_password"
```

**Important:** Add to `.gitignore`:
```bash
echo "terraform/kubernetes/01-secrets-prod.yaml" >> .gitignore
```

### Step 3: Create Kubernetes Cluster with Terraform

Navigate to the terraform directory and initialize:

```bash
cd terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Create the cluster (takes ~5-10 minutes)
terraform apply
```

Terraform will output:
- Cluster ID
- Cluster name
- Cluster endpoint
- Kubeconfig path

### Step 4: Configure kubectl

Set up kubectl to use the new cluster:

```bash
# Export kubeconfig from Terraform output
export KUBECONFIG=$(terraform output -raw kubeconfig_path)

# Verify connection
kubectl cluster-info
kubectl get nodes

# Expected output:
# NAME                   STATUS   ROLES    AGE   VERSION
# github-api-dev-pool-*  Ready    <none>   5m    v1.31.1
```

Alternatively, use doctl to configure kubectl:

```bash
# Get cluster ID from Terraform
CLUSTER_ID=$(terraform output -raw cluster_id)

# Configure kubectl
doctl kubernetes cluster kubeconfig save $CLUSTER_ID

# Verify
kubectl config current-context
```

### Step 5: Install Nginx Ingress Controller

Install the Nginx Ingress Controller to handle external traffic:

```bash
# Install from official Helm chart
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.5/deploy/static/provider/cloud/deploy.yaml

# Wait for the load balancer to be assigned an IP
kubectl get svc -n ingress-nginx -w

# Expected output (wait for EXTERNAL-IP):
# NAME                                 TYPE           EXTERNAL-IP      PORT(S)
# ingress-nginx-controller             LoadBalancer   138.197.49.129   80:32xxx/TCP,443:32xxx/TCP
```

**Note:** The external IP might be different. Update all ingress configuration if needed.

### Step 6: Deploy Kubernetes Resources

Deploy resources in the correct order to respect dependencies:

```bash
# Navigate to kubernetes directory
cd kubernetes

# 1. Create namespace
kubectl apply -f 00-namespace.yaml

# 2. Create secrets (use your production secrets file)
kubectl apply -f 01-secrets-prod.yaml

# 3. Create ConfigMaps
kubectl apply -f 02-configmaps/

# 4. Create StatefulSets (data layer)
kubectl apply -f 03-statefulsets/

# 5. Wait for StatefulSets to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n github-api-dev --timeout=300s
kubectl wait --for=condition=ready pod -l app=zookeeper -n github-api-dev --timeout=300s
kubectl wait --for=condition=ready pod -l app=kafka -n github-api-dev --timeout=300s
kubectl wait --for=condition=ready pod -l app=prometheus -n github-api-dev --timeout=300s

# 6. Create Deployments (application layer)
kubectl apply -f 04-deployments/

# 7. Wait for Deployments to be ready
kubectl wait --for=condition=available deployment --all -n github-api-dev --timeout=600s

# 8. Create DaemonSets (monitoring)
kubectl apply -f 05-daemonsets/

# 9. Create Ingress resources
kubectl apply -f 07-ingress/
```

### Step 7: Verify Deployment

Check that all resources are running correctly:

```bash
# View all pods
kubectl get pods -n github-api-dev

# Expected output:
# NAME                                READY   STATUS    RESTARTS   AGE
# api-xxxxx                           1/1     Running   0          5m
# docs-xxxxx                          1/1     Running   0          5m
# grafana-xxxxx                       1/1     Running   0          5m
# kafka-0                             1/1     Running   0          10m
# kafka-ui-xxxxx                      1/1     Running   0          5m
# node-exporter-xxxxx                 1/1     Running   0          3m
# postgres-0                          1/1     Running   0          10m
# postgres-exporter-xxxxx             1/1     Running   0          5m
# prometheus-0                        1/1     Running   0          10m
# zookeeper-0                         1/1     Running   0          10m

# Check services
kubectl get svc -n github-api-dev

# Check ingress
kubectl get ingress -n github-api-dev

# View pod logs
kubectl logs -f deployment/api -n github-api-dev
kubectl logs -f statefulset/postgres -n github-api-dev

# Check persistent volume claims
kubectl get pvc -n github-api-dev
```

### Step 8: Initialize Database

The API will automatically run Prisma migrations on startup. Verify the database is initialized:

```bash
# Connect to the API pod
kubectl exec -it deployment/api -n github-api-dev -- sh

# Inside the pod, check database
npx prisma db push
npx prisma migrate status

# Exit the pod
exit
```

### Step 9: Create Container Registry Secret (For Custom Images)

If you're using DigitalOcean Container Registry for your custom images:

```bash
# Create Docker registry secret
kubectl create secret docker-registry registry-github-api \
  --docker-server=registry.digitalocean.com \
  --docker-username=your_do_token \
  --docker-password=your_do_token \
  --docker-email=your_email@example.com \
  -n github-api-dev
```

The API and docs deployments reference this secret in `imagePullSecrets`.

## Accessing Services

All services are accessible through the load balancer at **http://138.197.49.129**:

### Public Services

| Service | URL | Description |
|---------|-----|-------------|
| API | http://138.197.49.129/ | REST API endpoints |
| Swagger UI | http://138.197.49.129/api/docs | API documentation and testing |
| Documentation | http://138.197.49.129/docs | VitePress documentation site |
| Grafana | http://138.197.49.129/grafana | Metrics dashboards |
| Prometheus | http://138.197.49.129/prometheus | Metrics and alerts |
| Kafka UI | http://138.197.49.129/kafka-ui | Kafka management interface |

### Testing Services

```bash
# Test API health
curl http://138.197.49.129/health

# Test API endpoint
curl http://138.197.49.129/api/repositories

# Test documentation
curl -I http://138.197.49.129/docs

# Test Swagger UI
curl -I http://138.197.49.129/api/docs
```

### Default Credentials

**Grafana:**
- Username: `admin`
- Password: (as configured in your secrets file)

**Note:** Change default passwords immediately in production.

## Monitoring

### Using Grafana

1. **Access Grafana:**
   - URL: http://138.197.49.129/grafana
   - Login with admin credentials

2. **Pre-configured Dashboards:**
   - **API Overview** - Request rates, response times, error rates
   - **Business Metrics** - Repository sync operations, GitHub API usage

3. **Explore Metrics:**
   - Navigate to "Explore" in the left sidebar
   - Select "Prometheus" as the data source
   - Query available metrics

### Using Prometheus

1. **Access Prometheus:**
   - URL: http://138.197.49.129/prometheus
   - No authentication required (should be secured in production)

2. **Query Metrics:**
   - Go to "Graph" tab
   - Example queries:
     ```promql
     # API request rate
     rate(http_requests_total[5m])

     # Memory usage
     container_memory_usage_bytes{namespace="github-api-dev"}

     # Database connections
     pg_stat_database_numbackends{datname="github_repos"}
     ```

3. **View Targets:**
   - Navigate to "Status" > "Targets"
   - Verify all scrape targets are UP:
     - nestjs-app (API metrics)
     - postgres (database metrics)
     - node-exporter (system metrics)
     - prometheus (self-monitoring)

### Viewing Logs

View logs from any component:

```bash
# API logs
kubectl logs -f deployment/api -n github-api-dev

# API logs from all replicas
kubectl logs -f deployment/api -n github-api-dev --all-containers

# Previous container logs (if restarted)
kubectl logs --previous deployment/api -n github-api-dev

# Postgres logs
kubectl logs -f statefulset/postgres -n github-api-dev

# Kafka logs
kubectl logs -f statefulset/kafka -n github-api-dev

# Grafana logs
kubectl logs -f deployment/grafana -n github-api-dev

# Follow logs with timestamps
kubectl logs -f deployment/api -n github-api-dev --timestamps

# Tail last 100 lines
kubectl logs deployment/api -n github-api-dev --tail=100
```

### Resource Usage

Monitor resource consumption:

```bash
# View node resource usage
kubectl top nodes

# View pod resource usage
kubectl top pods -n github-api-dev

# View detailed pod resource requests/limits
kubectl describe pod -n github-api-dev | grep -A 5 "Limits:\|Requests:"
```

## Kafka Integration

The application uses Kafka for asynchronous repository synchronization jobs.

### Purpose

Kafka enables:
- **Asynchronous processing** - Non-blocking repository sync operations
- **Scalability** - Multiple consumers can process sync jobs in parallel
- **Reliability** - Message persistence and replay capabilities
- **Decoupling** - Separation of API requests from long-running operations

### Topics

**repository.sync.request**
- Producer: API service
- Purpose: Queue repository sync requests
- Message format:
  ```json
  {
    "username": "octocat",
    "requestId": "uuid",
    "timestamp": "2025-10-15T12:00:00Z"
  }
  ```

**repository.sync.result**
- Producer: Sync worker (future implementation)
- Purpose: Publish sync completion status
- Message format:
  ```json
  {
    "username": "octocat",
    "requestId": "uuid",
    "status": "completed",
    "repositoryCount": 25,
    "timestamp": "2025-10-15T12:05:00Z"
  }
  ```

### Monitoring with Kafka UI

1. **Access Kafka UI:**
   - URL: http://138.197.49.129/kafka-ui
   - No authentication required

2. **View Topics:**
   - See all topics, partitions, and replication status
   - Monitor message rates and lag

3. **Browse Messages:**
   - Click on a topic to view messages
   - Search and filter messages
   - View message key, value, headers, and metadata

4. **Consumer Groups:**
   - Monitor consumer lag
   - Track offset positions
   - Identify slow consumers

### Kafka Operations

```bash
# Connect to Kafka pod
kubectl exec -it kafka-0 -n github-api-dev -- bash

# List topics (inside pod)
kafka-topics.sh --bootstrap-server localhost:9092 --list

# Describe a topic
kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic repository.sync.request

# Consume messages (for testing)
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic repository.sync.request --from-beginning

# Produce a test message
kafka-console-producer.sh --bootstrap-server localhost:9092 --topic repository.sync.request

# View consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Exit pod
exit
```

## Scaling

### Scaling Deployments

Scale stateless services horizontally:

```bash
# Scale API to 3 replicas
kubectl scale deployment api --replicas=3 -n github-api-dev

# Scale docs to 2 replicas
kubectl scale deployment docs --replicas=2 -n github-api-dev

# Verify scaling
kubectl get pods -n github-api-dev -l app=api

# Check pod distribution
kubectl get pods -n github-api-dev -o wide
```

**Important:** For multi-node clusters, ensure you have enough resources:

```bash
# View available node resources
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Scaling StatefulSets

StatefulSets require more careful scaling due to persistent storage:

```bash
# Scale Kafka (requires additional storage)
kubectl scale statefulset kafka --replicas=3 -n github-api-dev

# Wait for new replicas
kubectl rollout status statefulset/kafka -n github-api-dev

# Verify all Kafka brokers are running
kubectl get pods -l app=kafka -n github-api-dev
```

**Note:** Scaling StatefulSets also scales storage costs (each replica gets its own PVC).

### Auto-scaling (Horizontal Pod Autoscaler)

Enable auto-scaling based on CPU/memory:

```bash
# Auto-scale API based on CPU usage
kubectl autoscale deployment api \
  --cpu-percent=70 \
  --min=1 \
  --max=5 \
  -n github-api-dev

# View HPA status
kubectl get hpa -n github-api-dev

# Describe HPA
kubectl describe hpa api -n github-api-dev
```

### Scaling the Cluster

Scale the number of nodes in the cluster:

```bash
# Using Terraform
cd terraform
nano variables.tf  # Change node_count default value
terraform apply

# Or using doctl
doctl kubernetes cluster node-pool update \
  $(terraform output -raw cluster_id) \
  github-api-dev-pool \
  --count 3

# Verify nodes
kubectl get nodes
```

## Updates and Deployments

### Updating Application Image

Deploy a new version of the API:

```bash
# Update the image tag in the deployment
kubectl set image deployment/api \
  api=registry.digitalocean.com/github-api/github-api:v1.0.6 \
  -n github-api-dev

# Watch rollout progress
kubectl rollout status deployment/api -n github-api-dev

# View rollout history
kubectl rollout history deployment/api -n github-api-dev
```

### Rolling Back Deployments

Revert to a previous version:

```bash
# View revision history
kubectl rollout history deployment/api -n github-api-dev

# View details of a specific revision
kubectl rollout history deployment/api --revision=2 -n github-api-dev

# Rollback to previous version
kubectl rollout undo deployment/api -n github-api-dev

# Rollback to specific revision
kubectl rollout undo deployment/api --to-revision=2 -n github-api-dev

# Verify rollback
kubectl rollout status deployment/api -n github-api-dev
```

### Updating Configuration

Update ConfigMaps or Secrets:

```bash
# Edit ConfigMap
kubectl edit configmap prometheus-config -n github-api-dev

# Or apply updated file
kubectl apply -f 02-configmaps/prometheus-config.yaml

# Restart pods to pick up new configuration
kubectl rollout restart deployment/api -n github-api-dev
kubectl rollout restart statefulset/prometheus -n github-api-dev
```

### Zero-Downtime Deployments

Ensure rolling updates with zero downtime:

```yaml
# Add to deployment spec
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Max extra pods during update
      maxUnavailable: 0  # No pods down during update
```

Apply and test:

```bash
kubectl apply -f 04-deployments/api.yaml

# Monitor rolling update
kubectl get pods -n github-api-dev -w
```

## Troubleshooting

### Pod Not Starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n github-api-dev

# Common issues:
# - ImagePullBackOff: Check imagePullSecrets
# - CrashLoopBackOff: Check logs
# - Pending: Check node resources

# View recent events
kubectl get events -n github-api-dev --sort-by='.lastTimestamp'
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n github-api-dev

# Check if pods are selected by service
kubectl get pods -n github-api-dev --show-labels
kubectl describe service api -n github-api-dev

# Test service from inside cluster
kubectl run -it --rm debug --image=alpine --restart=Never -n github-api-dev -- sh
# Inside debug pod:
apk add curl
curl http://api:3000/health
exit
```

### Ingress Not Working

```bash
# Check ingress configuration
kubectl describe ingress -n github-api-dev

# Check Nginx Ingress Controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify Ingress Controller is running
kubectl get pods -n ingress-nginx

# Check load balancer external IP
kubectl get svc -n ingress-nginx
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
kubectl exec -it postgres-0 -n github-api-dev -- psql -U postgres -d github_repos

# Check database from API pod
kubectl exec -it deployment/api -n github-api-dev -- sh
# Inside pod:
npx prisma db push
npx prisma db seed
exit

# View database logs
kubectl logs -f postgres-0 -n github-api-dev

# Check database secret
kubectl get secret postgres-secret -n github-api-dev -o yaml
```

### Kafka Issues

```bash
# Check Zookeeper first (dependency)
kubectl logs -f zookeeper-0 -n github-api-dev

# Check Kafka logs
kubectl logs -f kafka-0 -n github-api-dev

# Verify Kafka is listening
kubectl exec -it kafka-0 -n github-api-dev -- netstat -tuln | grep 9092

# Test topic creation
kubectl exec -it kafka-0 -n github-api-dev -- \
  kafka-topics.sh --bootstrap-server localhost:9092 --list
```

### Storage Issues

```bash
# Check PVC status
kubectl get pvc -n github-api-dev

# Describe PVC for events
kubectl describe pvc postgres-storage-postgres-0 -n github-api-dev

# Check available storage on node
kubectl get nodes -o json | jq '.items[].status.allocatable.storage'

# View storage class
kubectl get storageclass
```

### Resource Constraints

```bash
# Check pod resource usage
kubectl top pods -n github-api-dev

# Check node resource usage
kubectl top nodes

# View resource requests and limits
kubectl describe pods -n github-api-dev | grep -A 5 "Limits:\|Requests:"

# Identify resource-starved pods
kubectl get pods -n github-api-dev -o json | \
  jq '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name'
```

### Common Error Solutions

**ImagePullBackOff:**
```bash
# Verify registry secret exists
kubectl get secret registry-github-api -n github-api-dev

# Recreate registry secret with correct credentials
kubectl delete secret registry-github-api -n github-api-dev
kubectl create secret docker-registry registry-github-api \
  --docker-server=registry.digitalocean.com \
  --docker-username=$DO_TOKEN \
  --docker-password=$DO_TOKEN \
  -n github-api-dev
```

**CrashLoopBackOff:**
```bash
# View logs from crashed container
kubectl logs <pod-name> -n github-api-dev --previous

# Common causes:
# - Missing environment variables (check secrets)
# - Database not ready (check readiness probe)
# - Application error (check application logs)
```

**Pending Pods:**
```bash
# Check why pod is pending
kubectl describe pod <pod-name> -n github-api-dev

# Common causes:
# - Insufficient node resources (scale cluster)
# - PVC not bound (check storage class)
# - Image pull failure (check imagePullSecrets)
```

## Cleanup

### Delete All Resources

To remove the entire deployment:

```bash
# Delete all Kubernetes resources
cd terraform/kubernetes
kubectl delete -f 07-ingress/
kubectl delete -f 05-daemonsets/
kubectl delete -f 04-deployments/
kubectl delete -f 03-statefulsets/
kubectl delete -f 02-configmaps/
kubectl delete -f 01-secrets-prod.yaml
kubectl delete -f 00-namespace.yaml

# Or delete namespace (removes everything in it)
kubectl delete namespace github-api-dev
```

### Destroy Kubernetes Cluster

To completely remove the cluster and free resources:

```bash
# Using Terraform
cd terraform
terraform destroy

# Or using doctl
CLUSTER_ID=$(terraform output -raw cluster_id)
doctl kubernetes cluster delete $CLUSTER_ID
```

**Warning:** This will delete all data permanently. Ensure you have backups!

### Backup Before Cleanup

Always backup critical data before destroying:

```bash
# Backup PostgreSQL database
kubectl exec -it postgres-0 -n github-api-dev -- \
  pg_dump -U postgres github_repos > backup-$(date +%Y%m%d).sql

# Backup Grafana dashboards
kubectl exec -it deployment/grafana -n github-api-dev -- \
  tar czf - /var/lib/grafana > grafana-backup-$(date +%Y%m%d).tar.gz

# Export all Kubernetes configurations
kubectl get all,pvc,configmap,secret -n github-api-dev -o yaml > k8s-backup-$(date +%Y%m%d).yaml
```

## Best Practices

### Security

1. **Never commit secrets** - Use `.gitignore` for secret files
2. **Use strong passwords** - Generate secure passwords for all services
3. **Enable RBAC** - Create service accounts with minimal permissions
4. **Network policies** - Restrict pod-to-pod communication
5. **Secure ingress** - Add SSL/TLS certificates (Let's Encrypt)
6. **Regular updates** - Keep Kubernetes and images updated

### Resource Management

1. **Set resource limits** - Prevent resource exhaustion
2. **Use readiness probes** - Ensure traffic only to healthy pods
3. **Use liveness probes** - Automatic restart of unhealthy pods
4. **Monitor metrics** - Set up alerts for resource thresholds
5. **Right-size pods** - Start small, scale based on metrics

### High Availability

1. **Multiple replicas** - For stateless services
2. **Pod disruption budgets** - Maintain minimum availability during updates
3. **Node affinity** - Spread pods across multiple nodes
4. **Health checks** - Automatic detection and recovery
5. **Backup strategy** - Regular automated backups

### Cost Optimization

1. **Single-node cluster** - Sufficient for development/staging
2. **Storage retention** - 1-day Prometheus, 7-day logs
3. **Resource limits** - Prevent over-provisioning
4. **Auto-scaling** - Scale down during low traffic
5. **Monitor costs** - Use DigitalOcean billing alerts

## Production Considerations

### SSL/TLS Configuration

Add SSL certificates to Ingress:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create Let's Encrypt issuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Add TLS to ingress
kubectl edit ingress github-api-ingress -n github-api-dev
# Add under spec:
#   tls:
#   - hosts:
#     - api.yourdomain.com
#     secretName: api-tls-cert
```

### Backup Strategy

Set up automated backups:

```bash
# Create backup cronjob
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: github-api-dev
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command:
            - /bin/sh
            - -c
            - pg_dump -U postgres -h postgres github_repos > /backup/backup-\$(date +\%Y\%m\%d).sql
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: postgres-backup-pvc
          restartPolicy: OnFailure
EOF
```

### Monitoring Alerts

Configure Prometheus alerts:

```yaml
# Add to prometheus-config ConfigMap
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: PodDown
        expr: up{job="nestjs-app"} == 0
        for: 1m
        annotations:
          summary: "API pod is down"
```

## Next Steps

- [Production Checklist](/production)
- [Security Guidelines](/security)
- [Troubleshooting Guide](/troubleshooting)
- [Architecture Overview](/architecture)
- [API Documentation](http://138.197.49.129/api/docs)

## Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [DigitalOcean Kubernetes](https://docs.digitalocean.com/products/kubernetes/)
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Terraform DigitalOcean Provider](https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
