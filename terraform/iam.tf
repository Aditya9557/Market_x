# --- IAM Role for EC2 ---
resource "aws_iam_role" "ec2_role" {
  name = "market-x-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Attach SSM policy to EC2 role for grabbing parameters and Session Manager
resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "market-x-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# --- Systems Manager Parameters ---
# We defined a KMS key for SSM encryption
resource "aws_ssm_parameter" "mongo_uri" {
  name        = "/market-x/prod/MONGO_URI"
  description = "Production MongoDB connection string"
  type        = "SecureString"
  value       = var.db_password
}

# The instances need permission to read parameters
resource "aws_iam_role_policy" "ssm_read_policy" {
  name = "market-x-ssm-read"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/market-x/prod/*"
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
