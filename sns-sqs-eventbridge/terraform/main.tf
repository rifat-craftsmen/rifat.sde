terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}

# SQS Dead Letter Queue
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project_name}-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${var.project_name}-dlq"
  }
}

# SQS Primary Queue with DLQ redrive policy
resource "aws_sqs_queue" "main" {
  name                       = "${var.project_name}-queue"
  visibility_timeout_seconds = var.sqs_visibility_timeout
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20      # Long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = {
    Name = "${var.project_name}-main-queue"
  }

  depends_on = [aws_sqs_queue.dlq]
}

# DynamoDB table for good messages
resource "aws_dynamodb_table" "messages" {
  name           = "${var.project_name}-messages"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "N"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-messages-table"
  }
}

# SNS Topic for DLQ notifications
resource "aws_sns_topic" "dlq_notifications" {
  name = "${var.project_name}-dlq-notifications"

  tags = {
    Name = "${var.project_name}-dlq-topic"
  }
}

# SNS Topic for bad message notifications
resource "aws_sns_topic" "bad_message_notifications" {
  name = "${var.project_name}-bad-message-notifications"

  tags = {
    Name = "${var.project_name}-bad-message-topic"
  }
}

# SNS Email subscription for DLQ (requires manual confirmation)
resource "aws_sns_topic_subscription" "dlq_email" {
  topic_arn = aws_sns_topic.dlq_notifications.arn
  protocol  = "email"
  endpoint  = var.admin_email
}

# SNS Email subscription for bad messages (requires manual confirmation)
resource "aws_sns_topic_subscription" "bad_message_email" {
  topic_arn = aws_sns_topic.bad_message_notifications.arn
  protocol  = "email"
  endpoint  = var.admin_email
}
