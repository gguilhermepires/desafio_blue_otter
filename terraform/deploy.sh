#!/bin/bash

set -e

echo "===== DigitalOcean Kubernetes Deployment Script ====="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: terraform is not installed${NC}"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

if ! command -v doctl &> /dev/null; then
    echo -e "${YELLOW}Warning: doctl is not installed (optional but recommended)${NC}"
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Step 1: Deploy infrastructure with Terraform
echo "===== Step 1: Deploying Infrastructure with Terraform ====="
echo ""

if [ ! -f "terraform.tfvars" ]; then
    echo -e "${RED}Error: terraform.tfvars not found!${NC}"
    echo "Please copy terraform.tfvars.example to terraform.tfvars and fill in your values"
    exit 1
fi

terraform init
terraform plan -out=deployment.tfplan
read -p "Apply Terraform plan? (yes/no): " apply_terraform

if [ "$apply_terraform" == "yes" ]; then
    terraform apply deployment.tfplan
    echo -e "${GREEN}✓ Infrastructure deployed${NC}"
else
    echo "Terraform apply cancelled"
    exit 0
fi

# Export kubeconfig
export KUBECONFIG=$(terraform output -raw kubeconfig_path)
echo -e "${GREEN}✓ Kubeconfig exported${NC}"
echo "KUBECONFIG=$KUBECONFIG"
echo ""

# Wait for cluster to be ready
echo "Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s
echo -e "${GREEN}✓ Cluster is ready${NC}"
echo ""

# Step 2: Deploy Kubernetes resources
echo "===== Step 2: Deploying Kubernetes Resources ====="
echo ""

# Namespace
echo "Creating namespace..."
kubectl apply -f kubernetes/00-namespace.yaml
echo -e "${GREEN}✓ Namespace created${NC}"

# Secrets
echo ""
echo -e "${YELLOW}Important: Update kubernetes/01-secrets.yaml with your actual secrets before proceeding!${NC}"
read -p "Have you updated the secrets file? (yes/no): " secrets_updated

if [ "$secrets_updated" != "yes" ]; then
    echo -e "${RED}Please update secrets and run this script again${NC}"
    exit 1
fi

kubectl apply -f kubernetes/01-secrets.yaml
echo -e "${GREEN}✓ Secrets created${NC}"

# ConfigMaps
echo "Creating ConfigMaps..."
kubectl apply -f kubernetes/02-configmaps/
echo -e "${GREEN}✓ ConfigMaps created${NC}"

# StatefulSets (deploy in order with dependencies)
echo ""
echo "Deploying StatefulSets..."

echo "  - PostgreSQL..."
kubectl apply -f kubernetes/03-statefulsets/postgres.yaml
kubectl wait --for=condition=ready pod/postgres-0 -n github-api-dev --timeout=300s
echo -e "${GREEN}  ✓ PostgreSQL ready${NC}"

echo "  - Zookeeper..."
kubectl apply -f kubernetes/03-statefulsets/zookeeper.yaml
kubectl wait --for=condition=ready pod/zookeeper-0 -n github-api-dev --timeout=300s
echo -e "${GREEN}  ✓ Zookeeper ready${NC}"

echo "  - Kafka..."
kubectl apply -f kubernetes/03-statefulsets/kafka.yaml
kubectl wait --for=condition=ready pod/kafka-0 -n github-api-dev --timeout=300s
echo -e "${GREEN}  ✓ Kafka ready${NC}"

echo "  - Prometheus..."
kubectl apply -f kubernetes/03-statefulsets/prometheus.yaml
kubectl wait --for=condition=ready pod/prometheus-0 -n github-api-dev --timeout=300s
echo -e "${GREEN}  ✓ Prometheus ready${NC}"

# Deployments
echo ""
echo "Deploying application services..."
kubectl apply -f kubernetes/04-deployments/
kubectl apply -f kubernetes/05-daemonsets/
echo -e "${GREEN}✓ Deployments created${NC}"

# Wait for deployments to be ready
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment --all -n github-api-dev --timeout=300s
echo -e "${GREEN}✓ All deployments ready${NC}"

# Install Nginx Ingress Controller
echo ""
echo "Installing Nginx Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/do/deploy.yaml

echo "Waiting for Ingress Controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s
echo -e "${GREEN}✓ Ingress Controller ready${NC}"

# Apply Ingress rules
echo ""
echo "Creating Ingress rules..."
kubectl apply -f kubernetes/07-ingress/
echo -e "${GREEN}✓ Ingress rules created${NC}"

# Get LoadBalancer IP
echo ""
echo "Waiting for LoadBalancer IP..."
sleep 30  # Give time for LB to provision

LB_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo ""
echo "===== Deployment Complete! ====="
echo ""
echo -e "${GREEN}✓ All resources deployed successfully${NC}"
echo ""
echo "Access your services:"
echo "  LoadBalancer IP: $LB_IP"
echo "  API:         http://$LB_IP/"
echo "  Grafana:     http://$LB_IP/grafana"
echo "  Prometheus:  http://$LB_IP/prometheus"
echo "  Kafka UI:    http://$LB_IP/kafka-ui"
echo ""
echo "Check status:"
echo "  kubectl get all -n github-api-dev"
echo "  kubectl get pvc -n github-api-dev"
echo "  kubectl get ingress -n github-api-dev"
echo ""
