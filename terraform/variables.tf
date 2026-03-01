variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "domain_name" {
  description = "The root domain name (e.g., example.com)"
  type        = string
}

variable "backend_subdomain" {
  description = "The subdomain for the backend (e.g., api.example.com)"
  type        = string
}

variable "frontend_subdomain" {
  description = "The subdomain for the frontend (e.g., www.example.com or example.com)"
  type        = string
}

variable "ami_id" {
  description = "Amazon Linux 2023 AMI ID"
  type        = string
  default     = "ami-02a53b0d62d37a757" # AL2023 in us-east-1
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "db_password" {
  description = "Database connection string or password to store in SSM"
  type        = string
  sensitive   = true
}

locals {
  common_tags = {
    Project     = "Market_x"
    Environment = "Production"
    Owner       = "Aditya"
    Application = "CampusDelivery"
  }
}
