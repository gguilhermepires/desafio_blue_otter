# DigitalOcean Kubernetes Deployment Guide

Complete guide for deploying the GitHub API to DigitalOcean Kubernetes (DOKS).

## Overview

This deployment uses:
- **Terraform** for infrastructure provisioning
- **Kubernetes** for container orchestration
- **1 Node Cluster** (s-2vcpu-4gb) for ultra-low cost
- **15GB total storage** across all services
- **1-day retention** for Kafka and Prometheus

**Estimated Monthly Cost: ~$37.50**

## Prerequisites

### Required Tools

1. **Terraform** (>= 1.0)
   ```bash
   # Install on Ubuntu/Debian
   wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform
   ```

2. **kubectl** (>= 1.28)
   ```bash
   # Install on Ubuntu/Debian
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
   ```

3. **doctl** (Optional but recommended)
   ```bash
   # Install on Ubuntu/Debian
   cd ~
   wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
   tar xf doctl-1.104.0-linux-amd64.tar.gz
   sudo mv doctl /usr/local/bin
   ```

4. **Docker** (for building images)
   - Already installed (native Docker in WSL2)

### DigitalOcean Account Setup

1. **Create DigitalOcean Account**
   - Sign up at https://cloud.digitalocean.com/registrations/new

2. **Generate API Token**
   - Go to: https://cloud.digitalocean.com/account/api/tokens
   - Click "Generate New Token"
   - Name: `terraform-github-api`
   - Scopes: Read & Write
   - Copy and save the token securely

3. **Set up Container Registry** (Optional)
   - Go to: https://cloud.digitalocean.com/registry
   - Create registry (free tier: 500MB)
   - Or use DockerHub instead

## Step-by-Step Deployment

### Phase 1: Prepare Configuration

1. **Configure Terraform Variables**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`**
   ```hcl
   do_token = "your-digitalocean-api-token"
   region = "nyc1"  # Choose closest region
   cluster_name = "github-api-dev"
   node_size = "s-2vcpu-4gb"
   node_count = 1
   ```

3. **Update Secrets**
   ```bash
   # Edit kubernetes/01-secrets.yaml
   # Replace placeholder passwords with secure values:
   # - POSTGRES_PASSWORD
   # - GF_SECURITY_ADMIN_PASSWORD
   # - GITHUB_TOKEN (if you have one)
   ```

### Phase 2: Build and Push Docker Image

1. **Build API Image**
   ```bash
   cd /home/guilherme/code/desafio_blue_otter
   docker build -t YOUR_REGISTRY/github-api:v1.0.0 .
   ```

2. **Push to Registry**

   **Option A: DigitalOcean Registry**
   ```bash
   doctl registry login
   docker tag YOUR_REGISTRY/github-api:v1.0.0 registry.digitalocean.com/YOUR_REGISTRY/github-api:v1.0.0
   docker push registry.digitalocean.com/YOUR_REGISTRY/github-api:v1.0.0
   ```

   **Option B: DockerHub**
   ```bash
   docker login
   docker tag YOUR_REGISTRY/github-api:v1.0.0 YOUR_DOCKERHUB_USERNAME/github-api:v1.0.0
   docker push YOUR_DOCKERHUB_USERNAME/github-api:v1.0.0
   ```

3. **Update API Deployment**
   ```bash
   # Edit terraform/kubernetes/04-deployments/api.yaml
   # Replace: image: YOUR_REGISTRY/github-api:latest
   # With: image: registry.digitalocean.com/YOUR_REGISTRY/github-api:v1.0.0
   ```

### Phase 3: Deploy Infrastructure

1. **Initialize Terraform**
   ```bash
   cd terraform
   terraform init
   ```

2. **Plan Deployment**
   ```bash
   terraform plan -out=deployment.tfplan
   ```

3. **Apply Terraform**
   ```bash
   terraform apply deployment.tfplan
   ```

4. **Configure kubectl**
   ```bash
   export KUBECONFIG=$(terraform output -raw kubeconfig_path)
   kubectl get nodes
   ```

### Phase 4: Deploy Application (Automated)

**Use the deployment script:**
```bash
cd terraform
./deploy.sh
```

The script will:
1. ✓ Check prerequisites
2. ✓ Deploy infrastructure with Terraform
3. ✓ Export kubeconfig
4. ✓ Create namespace and secrets
5. ✓ Deploy ConfigMaps
6. ✓ Deploy StatefulSets (PostgreSQL, Zookeeper, Kafka, Prometheus)
7. ✓ Deploy application services
8. ✓ Install Nginx Ingress Controller
9. ✓ Create Ingress rules
10. ✓ Display LoadBalancer IP

### Phase 5: Verify Deployment

1. **Check All Resources**
   ```bash
   kubectl get all -n github-api-dev
   kubectl get pvc -n github-api-dev
   kubectl get ingress -n github-api-dev
   ```

2. **Check Pod Logs**
   ```bash
   # API logs
   kubectl logs -n github-api-dev deployment/api --tail=50

   # PostgreSQL logs
   kubectl logs -n github-api-dev statefulset/postgres --tail=50

   # Kafka logs
   kubectl logs -n github-api-dev statefulset/kafka --tail=50
   ```

3. **Get LoadBalancer IP**
   ```bash
   kubectl get svc -n ingress-nginx ingress-nginx-controller
   ```

4. **Test Endpoints**
   ```bash
   LB_IP=<your-loadbalancer-ip>

   # Health check
   curl http://$LB_IP/health

   # API documentation
   curl http://$LB_IP/api/docs

   # Grafana (in browser)
   open http://$LB_IP/grafana

   # Prometheus (in browser)
   open http://$LB_IP/prometheus

   # Kafka UI (in browser)
   open http://$LB_IP/kafka-ui
   ```

## Manual Deployment (Alternative)

If you prefer to deploy step-by-step manually:

```bash
# 1. Namespace
kubectl apply -f kubernetes/00-namespace.yaml

# 2. Secrets
kubectl apply -f kubernetes/01-secrets.yaml

# 3. ConfigMaps
kubectl apply -f kubernetes/02-configmaps/

# 4. StatefulSets (in order)
kubectl apply -f kubernetes/03-statefulsets/postgres.yaml
kubectl wait --for=condition=ready pod/postgres-0 -n github-api-dev --timeout=300s

kubectl apply -f kubernetes/03-statefulsets/zookeeper.yaml
kubectl wait --for=condition=ready pod/zookeeper-0 -n github-api-dev --timeout=300s

kubectl apply -f kubernetes/03-statefulsets/kafka.yaml
kubectl wait --for=condition=ready pod/kafka-0 -n github-api-dev --timeout=300s

kubectl apply -f kubernetes/03-statefulsets/prometheus.yaml
kubectl wait --for=condition=ready pod/prometheus-0 -n github-api-dev --timeout=300s

# 5. Deployments
kubectl apply -f kubernetes/04-deployments/
kubectl apply -f kubernetes/05-daemonsets/

# 6. Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/do/deploy.yaml

# Wait for Ingress Controller
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

# 7. Ingress Rules
kubectl apply -f kubernetes/07-ingress/
```

## Configuration Details

### Resource Allocation

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| PostgreSQL | 200m | 512Mi | 5Gi |
| Kafka | 250m | 512Mi | 3Gi |
| Zookeeper | 100m | 256Mi | 2Gi |
| Prometheus | 150m | 384Mi | 3Gi |
| API | 100m | 256Mi | - |
| Grafana | 100m | 256Mi | 2Gi |
| Others | 50-100m | 64-128Mi | - |
| **Total** | **~1.1 vCPU** | **~2.4GB** | **15Gi** |

### Retention Policies

- **Kafka**: 24 hours (1 day)
- **Prometheus**: 24 hours (1 day)
- **PostgreSQL**: Permanent
- **Grafana**: Permanent

### Service Endpoints

After deployment, access services via LoadBalancer IP:

- **API**: `http://<LB_IP>/`
- **API Docs**: `http://<LB_IP>/api/docs`
- **Grafana**: `http://<LB_IP>/grafana` (admin/admin)
- **Prometheus**: `http://<LB_IP>/prometheus`
- **Kafka UI**: `http://<LB_IP>/kafka-ui`

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n github-api-dev

# Check pod logs
kubectl logs <pod-name> -n github-api-dev

# Check resource constraints
kubectl top nodes
kubectl top pods -n github-api-dev
```

### Storage Issues

```bash
# Check PVCs
kubectl get pvc -n github-api-dev

# Describe PVC
kubectl describe pvc <pvc-name> -n github-api-dev

# Check DigitalOcean volumes
doctl compute volume list
```

### Network Issues

```bash
# Check services
kubectl get svc -n github-api-dev

# Check ingress
kubectl describe ingress github-api-ingress -n github-api-dev

# Check LoadBalancer
kubectl get svc -n ingress-nginx
```

### Database Connection Issues

```bash
# Connect to PostgreSQL pod
kubectl exec -it postgres-0 -n github-api-dev -- psql -U postgres -d github_repos

# Test connection from API pod
kubectl exec -it deployment/api -n github-api-dev -- sh
# Inside pod:
nc -zv postgres 5432
```

## Updating the Application

### Update API Image

```bash
# Build new version
docker build -t YOUR_REGISTRY/github-api:v1.0.1 .
docker push YOUR_REGISTRY/github-api:v1.0.1

# Update deployment
kubectl set image deployment/api api=YOUR_REGISTRY/github-api:v1.0.1 -n github-api-dev

# Check rollout status
kubectl rollout status deployment/api -n github-api-dev
```

### Rollback

```bash
# View rollout history
kubectl rollout history deployment/api -n github-api-dev

# Rollback to previous version
kubectl rollout undo deployment/api -n github-api-dev
```

## Scaling

### Scale API Replicas

```bash
# Increase replicas (if you add more nodes)
kubectl scale deployment/api --replicas=2 -n github-api-dev
```

### Add More Nodes

```bash
# Edit terraform/variables.tf
# Change node_count from 1 to 2
terraform apply
```

## Cleanup

### Complete Teardown

```bash
cd terraform
./teardown.sh
```

This will:
1. Delete all Kubernetes resources
2. Delete PVCs and data
3. Destroy Terraform infrastructure
4. Remove LoadBalancer

### Partial Cleanup (Keep Cluster)

```bash
# Delete only application resources
kubectl delete -f kubernetes/07-ingress/
kubectl delete -f kubernetes/05-daemonsets/
kubectl delete -f kubernetes/04-deployments/
kubectl delete -f kubernetes/03-statefulsets/
```

## Cost Optimization

Current setup: **~$37.50/month**

- DOKS: 1x s-2vcpu-4gb = $24/month
- Block Storage: 15GB = $1.50/month
- Load Balancer: $12/month

**Further optimizations:**
- Remove Kafka UI deployment (-$0)
- Remove docs service (-$0)
- Reduce Prometheus retention to 12h (storage -$0.50)
- Use external managed services (increase cost but improve reliability)

## Security Considerations

⚠️ **Production Recommendations:**

1. **Use Secrets Manager**
   - HashiCorp Vault
   - DigitalOcean Spaces + encryption

2. **Enable TLS/SSL**
   - Use cert-manager with Let's Encrypt
   - Configure HTTPS ingress

3. **Network Policies**
   - Restrict pod-to-pod communication
   - Use Kubernetes Network Policies

4. **RBAC**
   - Create service accounts
   - Limit permissions

5. **Image Security**
   - Scan images for vulnerabilities
   - Use private registry

6. **Backup Strategy**
   - Regular PostgreSQL backups
   - DigitalOcean Volume snapshots

## Monitoring

### Access Grafana

1. Open `http://<LB_IP>/grafana`
2. Login: admin/admin (change on first login)
3. Navigate to Dashboards
4. Import community dashboards or create custom ones

### Check Prometheus Metrics

1. Open `http://<LB_IP>/prometheus`
2. Query metrics:
   - `up` - Check which targets are up
   - `rate(http_requests_total[5m])` - Request rate
   - `process_resident_memory_bytes` - Memory usage

## Support

For issues or questions:
- Terraform: https://www.terraform.io/docs
- Kubernetes: https://kubernetes.io/docs
- DigitalOcean: https://docs.digitalocean.com/products/kubernetes/
- Project Docs: `../docs/`
