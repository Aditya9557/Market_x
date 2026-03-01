# --- Application Load Balancer ---
resource "aws_lb" "alb" {
  name               = "market-x-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public[*].id
}

# --- Target Group ---
resource "aws_lb_target_group" "tg" {
  name     = "market-x-backend-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/api/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 3
    unhealthy_threshold = 3
    matcher             = "200"
  }
}

# --- HTTPS Listener (Assuming ACM Cert exists and provided or managed outside manually for now, or use a dummy)
# NOTE: Requires a valid ACM certificate in AWS
# resource "aws_lb_listener" "https" {
#   load_balancer_arn = aws_lb.alb.arn
#   port              = "443"
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-2016-08"
#   certificate_arn   = var.acm_certificate_arn # (Uncomment & supply ARN when using real domains)
# 
#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.tg.arn
#   }
# }

# --- HTTP Redirect to HTTPS (or forward if no SSL yet)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = "80"
  protocol          = "HTTP"

  # If HTTPS enabled, this should redirect:
  # default_action {
  #   type = "redirect"
  #   redirect {
  #     port        = "443"
  #     protocol    = "HTTPS"
  #     status_code = "HTTP_301"
  #   }
  # }
  
  # For immediate testing without a domain/SSL setup:
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg.arn
  }
}

# --- Launch Template ---
resource "aws_launch_template" "backend" {
  name_prefix   = "market-x-backend-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.ec2_sg.id]
  }

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -x
    
    # Update and install tools
    dnf update -y
    dnf install -y nginx git jq

    # Install Node.js
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs

    # Install PM2
    npm install -g pm2
    
    # Grab Secrets from SSM
    REGION="${var.region}"
    MONGO_URI=$(aws ssm get-parameter --region $REGION --name "/market-x/prod/MONGO_URI" --with-decryption --query "Parameter.Value" --output text)
    REDIS_HOST="${aws_elasticache_cluster.redis.cache_nodes[0].address}"
    
    # Configure Nginx reverse proxy
    cat << 'NGINX_CONF' > /etc/nginx/conf.d/market-x.conf
    server {
        listen 80;
        location / {
            proxy_pass http://127.0.0.1:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
        }
    }
    NGINX_CONF
    
    systemctl enable nginx
    systemctl restart nginx

    # Create App Directory
    mkdir -p /home/ec2-user/app
    
    # Setup Systemd to start app on reboot
    # (In a real scenario, CodeDeploy or a git pull happens here)
    # pm2 start ecosystem.config.js
    # pm2 save
    # pm2 startup systemd -u ec2-user --hp /home/ec2-user
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "market-x-backend-node"
    }
  }
}

# --- Auto Scaling Group ---
resource "aws_autoscaling_group" "asg" {
  name                = "market-x-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.tg.arn]
  max_size            = 4
  min_size            = 2
  desired_capacity    = 2

  launch_template {
    id      = aws_launch_template.backend.id
    version = "$Latest"
  }
  
  instance_refresh {
    strategy = "Rolling"
  }
}
