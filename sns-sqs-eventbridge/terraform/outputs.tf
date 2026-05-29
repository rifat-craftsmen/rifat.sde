output "sqs_main_queue_url" {
  description = "URL of the main SQS queue"
  value       = aws_sqs_queue.main.url
}

output "sqs_main_queue_arn" {
  description = "ARN of the main SQS queue"
  value       = aws_sqs_queue.main.arn
}

output "sqs_dlq_url" {
  description = "URL of the Dead Letter Queue"
  value       = aws_sqs_queue.dlq.url
}

output "sqs_dlq_arn" {
  description = "ARN of the Dead Letter Queue"
  value       = aws_sqs_queue.dlq.arn
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for messages"
  value       = aws_dynamodb_table.messages.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.messages.arn
}

output "sns_bad_message_topic_arn" {
  description = "ARN of the SNS topic for bad message notifications"
  value       = aws_sns_topic.bad_message_notifications.arn
}

output "sns_dlq_topic_arn" {
  description = "ARN of the SNS topic for DLQ notifications"
  value       = aws_sns_topic.dlq_notifications.arn
}

output "step_function_arn" {
  description = "ARN of the Step Function state machine"
  value       = aws_sfn_state_machine.message_processor.arn
}

output "eventbridge_pipe_name" {
  description = "Name of the EventBridge Pipe"
  value       = aws_pipes_pipe.sqs_to_stepfunctions.name
}

output "cost_estimation_note" {
  description = "Cost estimation for deployed resources"
  value = <<-EOT
    Cost Estimation:
    - SQS: $0.40 per million requests (pay-per-request)
    - DynamoDB: On-demand billing (pay-per-request)
    - Step Functions: $0.000025 per state transition (approximately)
    - SNS: $0.50 per million notifications
    - EventBridge Pipe: $0.35 per DPU-hour (default 1 DPU)

    For 10 messages/batch processing:
    Estimated monthly cost ~$5-15 (depending on volume and error rate)
    See AWS Pricing pages for exact calculations based on your volume.
  EOT
}
