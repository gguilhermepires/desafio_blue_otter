# Terraform + Kubernetes Deployment for GitHub API

This directory contains all the infrastructure-as-code and Kubernetes manifests needed to deploy the GitHub Repository Management API to DigitalOcean Kubernetes.

## Quick Start

```bash
# 1. Configure Terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your DigitalOcean token

# 2. Update secrets
# Edit kubernetes/01-secrets.yaml with secure passwords

# 3. Build and push Docker image
docker build -t YOUR_REGISTRY/github-api:v1.0.0 ..
docker push YOUR_REGISTRY/github-api:v1.0.0

# 4. Update image reference
# Edit kubernetes/04-deployments/api.yaml

# 5. Deploy everything
./deploy.sh
```

## Directory Structure

```
terraform/
├── main.tf                      # Terraform main configuration
├── variables.tf                 # Input variables
├── outputs.tf                   # Output values
├── terraform.tfvars.example     # Example variables file
├── deploy.sh                    # Automated deployment script
├── teardown.sh                  # Cleanup script
├── DEPLOYMENT.md                # Complete deployment guide
├── README.md                    # This file
└── kubernetes/                  # Kubernetes manifests
    ├── 00-namespace.yaml
    ├── 01-secrets.yaml
    ├── 02-configmaps/
    │   ├── prometheus-config.yaml
    │   └── grafana-provisioning.yaml
    ├── 03-statefulsets/
    │   ├── postgres.yaml
    │   ├── zookeeper.yaml
    │   ├── kafka.yaml
    │   └── prometheus.yaml
    ├── 04-deployments/
    │   ├── api.yaml
    │   ├── grafana.yaml
    │   ├── postgres-exporter.yaml
    │   └── kafka-ui.yaml
    ├── 05-daemonsets/
    │   └── node-exporter.yaml
    └── 07-ingress/
        └── ingress.yaml
```

## Architecture

### Infrastructure (Terraform)
- **DOKS Cluster**: 1 node (s-2vcpu-4gb)
- **Block Storage**: 15GB total across all services
- **Load Balancer**: Automatically provisioned by Kubernetes

### Services (Kubernetes)
- **PostgreSQL**: 5GB storage (database)
- **Kafka**: 3GB storage (1-day retention)
- **Zookeeper**: 2GB storage (Kafka coordination)
- **Prometheus**: 3GB storage (1-day metrics)
- **Grafana**: 2GB storage (dashboards)
- **API**: NestJS application
- **Monitoring**: Node exporter, Postgres exporter, Kafka UI

## Cost Breakdown

| Resource | Cost/Month |
|----------|-----------|
| DOKS (1 node) | $24.00 |
| Block Storage (15GB) | $1.50 |
| Load Balancer | $12.00 |
| **Total** | **~$37.50** |

## Prerequisites

- Terraform >= 1.0
- kubectl >= 1.28
- Docker
- DigitalOcean account + API token
- Container registry (DigitalOcean or DockerHub)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed installation instructions.

## Key Features

✓ **Ultra-low cost** single-node cluster
✓ **Automated deployment** with scripts
✓ **Complete monitoring** stack (Prometheus + Grafana)
✓ **Message queue** (Kafka + Zookeeper)
✓ **Ingress routing** for all services
✓ **Persistent storage** with DigitalOcean volumes
✓ **1-day retention** to minimize storage costs

## Deployment Options

### Option 1: Automated (Recommended)
```bash
./deploy.sh
```

### Option 2: Manual Step-by-Step
See [DEPLOYMENT.md](./DEPLOYMENT.md) for manual deployment instructions.

## Accessing Services

After deployment, get your LoadBalancer IP:
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

Then access services at:
- API: `http://<LB_IP>/`
- API Docs: `http://<LB_IP>/api/docs`
- Grafana: `http://<LB_IP>/grafana`
- Prometheus: `http://<LB_IP>/prometheus`
- Kafka UI: `http://<LB_IP>/kafka-ui`

## Management Commands

```bash
# Check all resources
kubectl get all -n github-api-dev

# Check storage
kubectl get pvc -n github-api-dev

# View logs
kubectl logs -n github-api-dev deployment/api --tail=50

# Scale API (if you add more nodes)
kubectl scale deployment/api --replicas=2 -n github-api-dev

# Update API image
kubectl set image deployment/api api=NEW_IMAGE -n github-api-dev

# Complete teardown
./teardown.sh
```

## Limitations (Single Node Setup)

⚠️ **This is optimized for development, not production:**

- No high availability
- Single point of failure
- No automatic failover
- Limited resources (2 vCPU, 4GB RAM)
- 1-day data retention

**For production**, consider:
- 3+ nodes for HA
- Managed database (DigitalOcean Managed PostgreSQL)
- Longer retention periods
- TLS/SSL with cert-manager
- Network policies and RBAC

## Troubleshooting

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive troubleshooting guide.

Quick checks:
```bash
# Pod status
kubectl describe pod <pod-name> -n github-api-dev

# Resource usage
kubectl top nodes
kubectl top pods -n github-api-dev

# Service endpoints
kubectl get endpoints -n github-api-dev

# Ingress status
kubectl describe ingress github-api-ingress -n github-api-dev
```

## Further Reading

- [Complete Deployment Guide](./DEPLOYMENT.md)
- [Terraform Documentation](https://www.terraform.io/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs)
- [DigitalOcean Kubernetes](https://docs.digitalocean.com/products/kubernetes/)
