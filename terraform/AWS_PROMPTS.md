# Market_x AWS Deployment Prompts

Use these prompts to ask an AI (like AWS Q, ChatGPT, or Claude) to set up resources for your `Market_x` project using the AWS Console or AWS CLI. 

Each prompt provides the AI with the exact context of our project files so it can give you precise instructions.

---

## 1. Networking & Security Setup Prompt
**Copy and paste this to the AI:**
> "I am setting up the AWS networking for my full-stack app 'Market_x'. 
> I need you to guide me step-by-step through the AWS Console to create a custom VPC (10.0.0.0/16) with 2 public subnets (for my Load Balancer) and 2 private subnets (for my EC2 backend and Redis). 
> I also need three Security Groups:
> 1. ALB-SG (allows HTTP/HTTPS from anywhere).
> 2. EC2-SG (allows port 80/5000 only from ALB-SG).
> 3. REDIS-SG (allows port 6379 only from EC2-SG).
> Give me the exact clicks in the AWS Management Console to set this up."

---

## 2. Database & Redis Setup Prompt
**Copy and paste this to the AI:**
> "My 'Market_x' backend uses Node.js, Express, and Socket.io. I need to set up the data layer in AWS.
> 1. For Redis: Guide me through creating an Amazon ElastiCache (Redis 7.0) cluster on a t4g.micro node. It must be placed in my private subnets and use the REDIS-SG security group so it has no public IP.
> 2. For MongoDB: I will use MongoDB Atlas. Guide me through adding my AWS VPC's NAT Gateway IP to the Atlas Network Access allowlist so my private EC2 instances can connect to it.
> Please provide the step-by-step AWS Console instructions."

---

## 3. IAM & Secrets Setup Prompt
**Copy and paste this to the AI:**
> "My 'Market_x' Node.js backend needs to securely read its MongoDB URI and JWT secrets from AWS instead of a local .env file.
> 1. Guide me through AWS Systems Manager (SSM) Parameter Store to create a SecureString parameter named `/market-x/prod/MONGO_URI`.
> 2. Guide me through AWS IAM to create an 'EC2 IAM Role'. This role needs the 'AmazonSSMManagedInstanceCore' policy, and an inline policy allowing `ssm:GetParameter` for `/market-x/prod/*`. 
> I need the exact steps to create this role and attach it to an Instance Profile via the AWS Console."

---

## 4. Compute & Auto-Scaling (EC2 Backend) Prompt
**Copy and paste this to the AI:**
> "I am deploying my 'Market_x' Node.js backend on AWS EC2. I need you to guide me through creating an EC2 Launch Template and Auto Scaling Group.
> 
> **Launch Template Requirements:**
> - Amazon Linux 2023 AMI (t3.micro).
> - Attach the 'EC2-SG' security group and my custom IAM Role.
> - I need a User Data script that does the following: Updates the OS, installs Node.js 20, installs pm2 and git, installs Nginx, and configures Nginx as a reverse proxy forwarding port 80 to 127.0.0.1:5000 (with Socket.io upgrade headers included). It must also use the AWS CLI to fetch `/market-x/prod/MONGO_URI` from SSM and export it.
> 
> **Auto Scaling Group Requirements:**
> - Min 2, Max 4 instances.
> - Placed in my private subnets.
> - CloudWatch scaling policies: Scale up if CPU > 80%, out if CPU < 30%.
> 
> Write the User Data script for me, and give me the AWS Console steps to create the Template and ASG."

---

## 5. Load Balancer & Domains Prompt
**Copy and paste this to the AI:**
> "My 'Market_x' backend EC2 instances are in an Auto Scaling Group in private subnets. I need to expose them to the internet securely.
> Guide me through setting up an Application Load Balancer (ALB) via the AWS Console:
> 1. It must be Internet-facing in my public subnets using the 'ALB-SG' security group.
> 2. Create a Target Group (HTTP on port 5000) with a health check path of `/api/health`.
> 3. Show me how to request an SSL certificate in AWS Certificate Manager (ACM) for my API subdomain (`api.marketx.com`).
> 4. Set up an HTTPS listener on the ALB that forwards traffic to the Target Group.
> Provide step-by-step instructions."

---

## 6. Frontend Deployment (S3 + CloudFront) Prompt
**Copy and paste this to the AI:**
> "I have a React (Vite) frontend for my 'Market_x' app. I want to host it serverless on AWS.
> I need you to guide me through the AWS Console to:
> 1. Create a private S3 bucket (Block Public Access turned ON).
> 2. Create a CloudFront Distribution pointing to the S3 bucket.
> 3. Configure Origin Access Control (OAC) so CloudFront has permission to read the bucket, but the bucket remains private.
> 4. Configure CloudFront error pages so 404/403 errors return `index.html` with a 200 status (required for React Router SPA).
> 5. Show me the AWS CLI command to sync my local `dist/` folder to the S3 bucket after I run `npm run build`.
> Give me the exact clicks and commands required."
