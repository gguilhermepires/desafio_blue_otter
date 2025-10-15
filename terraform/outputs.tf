output "cluster_id" {
  description = "ID of the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.github_api_cluster.id
}

output "cluster_name" {
  description = "Name of the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.github_api_cluster.name
}

output "cluster_endpoint" {
  description = "Endpoint URL for the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.github_api_cluster.endpoint
}

output "cluster_region" {
  description = "Region where the cluster is deployed"
  value       = digitalocean_kubernetes_cluster.github_api_cluster.region
}

output "kubeconfig" {
  description = "Kubeconfig for the cluster"
  value       = digitalocean_kubernetes_cluster.github_api_cluster.kube_config[0].raw_config
  sensitive   = true
}

output "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  value       = local_file.kubeconfig.filename
}
