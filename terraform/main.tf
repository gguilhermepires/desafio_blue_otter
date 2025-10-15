terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
  required_version = ">= 1.0"
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_kubernetes_cluster" "github_api_cluster" {
  name    = var.cluster_name
  region  = var.region
  version = var.kubernetes_version

  node_pool {
    name       = "${var.cluster_name}-pool"
    size       = var.node_size
    node_count = var.node_count
  }

  tags = ["development", "github-api"]
}

# Save kubeconfig to file
resource "local_file" "kubeconfig" {
  content  = digitalocean_kubernetes_cluster.github_api_cluster.kube_config[0].raw_config
  filename = "${path.module}/kubeconfig-${var.cluster_name}.yaml"
  file_permission = "0600"
}
