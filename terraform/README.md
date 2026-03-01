# Market_x AWS Production Infrastructure

This directory contains the automated Infrastructure as Code (IaC) written in **Terraform** designed specifically for the `Market_x` application stack.

## Architecture Follows Required Spec
1. **Networking**: Custom VPC with 2 Public subnets (ALB & NAT), 2 Private subnets (EC2, Redis). Internet Gateway and NAT Gateway attached.
2. **Compute**: EC2 instances via Launch Template (Amazon Linux 2023) within an Auto Scaling Group. Configured to automatically install Node, Nginx, PM2, and PM2 service.
3. **Database**: Parameter configuration ready to accept MongoDB Atlas connection securely into EC2 without exposing creds.
4. **Redis Cache**: Amazon ElastiCache (Redis engine) securely hidden exclusively within the private subnets.
5. **Frontend Deploy**: S3 bucket (private) wrapped entirely by CloudFront (OAC) functioning as a global CDN.
6. **Secrets Management**: AWS Systems Manager (SSM Parameter Store) replaces `.env` files. EC2 instance retrieves `MONGO_URI` directly at runtime.
7. **Load Balancer**: Application Load Balancer in the public subnet routing HTTP/HTTPS traffic to port 5000 internally.
8. **Auto-scaling**: ASG policy tracks CPU going > 80% to scale out and < 30% to scale in.
9. **IAM Least Privilege**: Uses IAM Instance Profiles instead of root keys to let EC2 query SSM dynamically.
10. **Tags**: Project = Market_x, Environment = Production, Owner = Aditya, Application = CampusDelivery included automatically on resources.

## Deployment Instructions

### Prerequisites
1. [Terraform](https://developer.hashicorp.com/terraform/downloads) installed on your machine.
2. [AWS CLI](https://aws.amazon.com/cli/) installed, configured, and logged into your AWS account representing admin capabilities (`aws configure`).

### Step 1: Initialize
Run the initialization to download the AWS modules inside the `terraform` folder:
```bash
terraform init
```

### Step 2: Set MongoDB Connection Password
Terraform needs your MongoDB URI securely. Create a file called `terraform.tfvars` inside this folder and add:
```hcl
db_password        = "mongodb+srv://<user>:<password>@cluster0.mongodb.net/project_hero"
domain_name        = "example.com"
backend_subdomain  = "api.example.com"
frontend_subdomain = "example.com"
```
*(Do not commit your `terraform.tfvars` file to Git!)*

### Step 3: Plan Infrastructure
```bash
terraform plan
```
This safely previews exactly what AWS resources Terraform will build.

### Step 4: Apply Construction
```bash
terraform apply
```
Type `yes` when prompted. This will build everything. It takes about 3-5 minutes (Redis cluster and NAT Gateways take the longest).

### Step 5: Post Deploy (Frontend)
When Terraform finishes, it outputs `frontend_cloudfront_domain` and `s3_bucket_name`. 

To deploy the frontend UI securely into the S3 bucket:
```bash
cd ../frontend
npm run build
aws s3 sync dist/ s3://<YOUR_OUTPUTTED_S3_BUCKET_NAME>
```

### Note on HTTPS (SSL/TLS Certificates)
The config includes setup for HTTP/80 on the Application Load Balancer. For production (HTTPS), generate an AWS Certificate Manager (ACM) SSL certificate first manually, then uncomment the HTTPS listener block inside `ec2.tf` and supply the `certificate_arn`.
