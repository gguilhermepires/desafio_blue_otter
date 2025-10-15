variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean region for the cluster"
  type        = string
  default     = "nyc1"
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
  default     = "github-api-dev"
}

variable "node_size" {
  description = "Size of the nodes in the cluster"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "node_count" {
  description = "Number of nodes in the cluster"
  type        = number
  default     = 1
}

variable "kubernetes_version" {
  description = "Kubernetes version to use"
  type        = string
  default     = "1.31.1-do.4"  # Update to latest stable version
}
