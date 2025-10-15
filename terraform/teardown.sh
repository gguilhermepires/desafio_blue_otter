#!/bin/bash

set -e

echo "===== DigitalOcean Kubernetes Teardown Script ====="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}WARNING: This will destroy all resources!${NC}"
echo "This includes:"
echo "  - Kubernetes cluster"
echo "  - All deployments and stateful sets"
echo "  - All persistent volumes and data"
echo "  - Load balancer"
echo ""
read -p "Are you sure you want to continue? Type 'destroy' to confirm: " confirmation

if [ "$confirmation" != "destroy" ]; then
    echo "Teardown cancelled"
    exit 0
fi

# Export kubeconfig if it exists
if [ -f "$(terraform output -raw kubeconfig_path 2>/dev/null)" ]; then
    export KUBECONFIG=$(terraform output -raw kubeconfig_path)
    echo "Kubeconfig found"

    # Delete Kubernetes resources first
    echo ""
    echo "Deleting Kubernetes resources..."

    kubectl delete -f kubernetes/07-ingress/ --ignore-not-found=true
    kubectl delete -f kubernetes/05-daemonsets/ --ignore-not-found=true
    kubectl delete -f kubernetes/04-deployments/ --ignore-not-found=true
    kubectl delete -f kubernetes/03-statefulsets/ --ignore-not-found=true
    kubectl delete -f kubernetes/02-configmaps/ --ignore-not-found=true
    kubectl delete -f kubernetes/01-secrets.yaml --ignore-not-found=true

    # Delete PVCs
    kubectl delete pvc --all -n github-api-dev --ignore-not-found=true

    # Delete namespace
    kubectl delete -f kubernetes/00-namespace.yaml --ignore-not-found=true

    # Delete Nginx Ingress Controller
    kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/do/deploy.yaml --ignore-not-found=true

    echo -e "${GREEN}✓ Kubernetes resources deleted${NC}"
fi

# Destroy Terraform infrastructure
echo ""
echo "Destroying Terraform infrastructure..."
terraform destroy -auto-approve

echo ""
echo -e "${GREEN}✓ Teardown complete${NC}"
echo ""
echo "Cleanup kubeconfig files manually if needed:"
echo "  rm -f kubeconfig-*.yaml"
echo ""
