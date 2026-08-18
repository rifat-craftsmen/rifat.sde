# ── CloudWatch Log Groups ──────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "pipe_logs" {
  name              = "/aws/pipes/${var.project_name}-sqs-to-sf"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "dlq_pipe_logs" {
  name              = "/aws/pipes/${var.project_name}-dlq-to-sns"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "sf_logs" {
  name              = "/aws/states/${var.project_name}-processor"
  retention_in_days = 7
}

# ── IAM: Pipe role → CloudWatch Logs ──────────────────────────────────────────

resource "aws_iam_role_policy" "eventbridge_pipe_logs" {
  name = "${var.project_name}-eventbridge-pipe-logs"
  role = aws_iam_role.eventbridge_pipe_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "${aws_cloudwatch_log_group.pipe_logs.arn}:*"
    }]
  })
}

# ── IAM: SF role → CloudWatch Logs ────────────────────────────────────────────
# Express workflows write logs via a log delivery mechanism that requires
# a broader set of logs:* actions on the role.

resource "aws_iam_role_policy" "step_function_logs" {
  name = "${var.project_name}-step-function-logs"
  role = aws_iam_role.step_function_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.sf_logs.arn}:*"
      }
    ]
  })
}

