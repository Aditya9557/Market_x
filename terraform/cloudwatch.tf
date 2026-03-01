# --- Auto-Scaling Policy ---
resource "aws_autoscaling_policy" "scale_up_cpu" {
  name                   = "market-x-scale-up-cpu"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.asg.name
}

resource "aws_autoscaling_policy" "scale_down_cpu" {
  name                   = "market-x-scale-down-cpu"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.asg.name
}

# --- CloudWatch Alarms for CPU ---
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "market-x-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization > 80% to scale up."
  
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.asg.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_up_cpu.arn]
}

resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "market-x-low-cpu"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "30"
  alarm_description   = "This metric monitors ec2 cpu utilization < 30% to scale down."
  
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.asg.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_down_cpu.arn]
}

# --- Target Tracking (Better alternative for memory if CW Agent pushes custom metrics) ---
# Note: AWS does not track Memory by default. The User Data template includes 
# installing the CloudWatch Agent which pushes memory usage. Once memory metrics
# are available in AWS/EC2 custom namespace, a similar metric_alarm can be built.
