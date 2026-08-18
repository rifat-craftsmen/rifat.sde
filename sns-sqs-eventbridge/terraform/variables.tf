variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "trainee-rifat-message-processor"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "admin_email" {
  description = "Email address for SNS notifications (bad messages and DLQ alerts)"
  type        = string
  sensitive   = true
}

variable "sqs_visibility_timeout" {
  description = "Visibility timeout for SQS messages in seconds"
  type        = number
  default     = 30
}

variable "max_receive_count" {
  description = "Maximum number of times a message can be received before being sent to DLQ"
  type        = number
  default     = 2
}

variable "eventbridge_batch_size" {
  description = "Batch size for EventBridge Pipe (max 10 for SQS)"
  type        = number
  default     = 5
}

variable "eventbridge_batching_window" {
  description = "Maximum batching window in seconds"
  type        = number
  default     = 0
}

variable "enable_dynamodb_pitr" {
  description = "Enable Point-in-Time Recovery for DynamoDB"
  type        = bool
  default     = true
}
