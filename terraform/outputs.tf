output "vpc_id" {
  value = aws_vpc.main.id
}

output "backend_alb_dns" {
  value = aws_lb.alb.dns_name
  description = "The DNS name of the Application Load Balancer (for the Express backend and WebSocket)"
}

output "frontend_cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend_dist.domain_name
  description = "The CloudFront domain for your React frontend."
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
  description = "The endpoint of the private Redis ElastiCache instance"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.frontend.id
  description = "The deployment bucket for the static React build"
}
