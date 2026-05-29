resource "aws_iam_role" "eventbridge_pipe_role" {
  name = "${var.project_name}-eventbridge-pipe-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "pipes.amazonaws.com"
        }
      }
    ]
  })
}

# Permission for EventBridge Pipe to read from SQS
resource "aws_iam_role_policy" "eventbridge_pipe_sqs_source" {
  name = "${var.project_name}-eventbridge-pipe-sqs-source"
  role = aws_iam_role.eventbridge_pipe_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.main.arn
      }
    ]
  })
}

# Permission for EventBridge Pipe to invoke Step Function
resource "aws_iam_role_policy" "eventbridge_pipe_stepfunctions_target" {
  name = "${var.project_name}-eventbridge-pipe-stepfunctions-target"
  role = aws_iam_role.eventbridge_pipe_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "states:StartSyncExecution"
        ]
        Resource = aws_sfn_state_machine.message_processor.arn
      }
    ]
  })
}

# EventBridge Pipe: SQS -> Step Function (REQUEST_RESPONSE mode)
resource "aws_pipes_pipe" "sqs_to_stepfunctions" {
  name             = "${var.project_name}-sqs-to-sf"
  description      = "EventBridge Pipe to route SQS messages to Step Function"
  role_arn         = aws_iam_role.eventbridge_pipe_role.arn
  source           = aws_sqs_queue.main.arn
  target           = aws_sfn_state_machine.message_processor.arn
  desired_state    = "RUNNING"

  source_parameters {
    sqs_queue_parameters {
      batch_size                         = var.eventbridge_batch_size
      maximum_batching_window_in_seconds = var.eventbridge_batching_window
    }
  }

  target_parameters {
    step_function_state_machine_parameters {
      invocation_type = "REQUEST_RESPONSE"
    }
  }

  log_configuration {
    level                  = "TRACE"
    include_execution_data = ["ALL"]
    cloudwatch_logs_log_destination {
      log_group_arn = aws_cloudwatch_log_group.pipe_logs.arn
    }
  }

  depends_on = [aws_iam_role_policy.eventbridge_pipe_logs]
}

# ── DLQ → SNS Pipe ─────────────────────────────────────────────────────────────
# CloudWatch alarm only fires on OK→ALARM transition, so it misses subsequent
# DLQ messages if the alarm is already in ALARM state. This pipe fires for
# every individual message that lands in the DLQ.

resource "aws_iam_role" "dlq_pipe_role" {
  name = "${var.project_name}-dlq-pipe-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "pipes.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "dlq_pipe_sqs" {
  name = "${var.project_name}-dlq-pipe-sqs"
  role = aws_iam_role.dlq_pipe_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
      Resource = aws_sqs_queue.dlq.arn
    }]
  })
}

resource "aws_iam_role_policy" "dlq_pipe_sns" {
  name = "${var.project_name}-dlq-pipe-sns"
  role = aws_iam_role.dlq_pipe_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sns:Publish"]
      Resource = aws_sns_topic.dlq_notifications.arn
    }]
  })
}

resource "aws_iam_role_policy" "dlq_pipe_logs" {
  name = "${var.project_name}-dlq-pipe-logs"
  role = aws_iam_role.dlq_pipe_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.dlq_pipe_logs.arn}:*"
    }]
  })
}

resource "aws_pipes_pipe" "dlq_to_sns" {
  name          = "${var.project_name}-dlq-to-sns"
  description   = "Forward every DLQ message to SNS — fires per message unlike CW alarm"
  role_arn      = aws_iam_role.dlq_pipe_role.arn
  source        = aws_sqs_queue.dlq.arn
  target        = aws_sns_topic.dlq_notifications.arn
  desired_state = "RUNNING"

  source_parameters {
    sqs_queue_parameters {
      batch_size = 1
    }
  }

  log_configuration {
    level                  = "TRACE"
    include_execution_data = ["ALL"]
    cloudwatch_logs_log_destination {
      log_group_arn = aws_cloudwatch_log_group.dlq_pipe_logs.arn
    }
  }

  depends_on = [aws_iam_role_policy.dlq_pipe_logs]
}
