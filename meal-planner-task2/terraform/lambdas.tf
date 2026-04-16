# ─── Discord Authorizer ───────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "discord_authorizer" {
  name              = "/aws/lambda/trainee-2026-rifat-discord-authorizer-v2"
  retention_in_days = 14
}

resource "aws_lambda_function" "discord_authorizer" {
  function_name = "trainee-2026-rifat-discord-authorizer-v2"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = var.image_uri
  timeout       = 10
  memory_size   = 128
  architectures = ["x86_64"]

  image_config {
    command = ["lambda.handler"]
  }

  environment {
    variables = {
      DISCORD_PUBLIC_KEY = var.discord_public_key
    }
  }

  depends_on = [aws_cloudwatch_log_group.discord_authorizer]
}

# ─── Discord Main ─────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "discord_lambda" {
  name              = "/aws/lambda/trainee-2026-rifat-discord-lambda-v2"
  retention_in_days = 14
}

resource "aws_lambda_function" "discord_main" {
  function_name = "trainee-2026-rifat-discord-lambda-v2"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = var.image_uri
  timeout       = 30
  memory_size   = 512
  architectures = ["x86_64"]

  image_config {
    command = ["lambda.handler"]
  }

  environment {
    variables = {
      DISCORD_PUBLIC_KEY  = var.discord_public_key
      DYNAMODB_TABLE_MAIN = var.dynamodb_table_name
    }
  }

  depends_on = [aws_cloudwatch_log_group.discord_lambda]
}

# ─── Google Authorizer ────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "google_authorizer" {
  name              = "/aws/lambda/trainee-2026-rifat-google-authorizer-v2"
  retention_in_days = 14
}

resource "aws_lambda_function" "google_authorizer" {
  function_name = "trainee-2026-rifat-google-authorizer-v2"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = var.image_uri
  timeout       = 10
  memory_size   = 256
  architectures = ["x86_64"]

  image_config {
    command = ["googleLambda.handler"]
  }

  environment {
    variables = {
      GOOGLE_CHAT_APP_ID = var.google_chat_app_id
    }
  }

  depends_on = [aws_cloudwatch_log_group.google_authorizer]
}

# ─── Google Main ──────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "google_lambda" {
  name              = "/aws/lambda/trainee-2026-rifat-google-lambda-v2"
  retention_in_days = 14
}

resource "aws_lambda_function" "google_main" {
  function_name = "trainee-2026-rifat-google-lambda-v2"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = var.image_uri
  timeout       = 30
  memory_size   = 256
  architectures = ["x86_64"]

  image_config {
    command = ["googleLambda.handler"]
  }

  environment {
    variables = {
      DYNAMODB_TABLE_MAIN = var.dynamodb_table_name
      GOOGLE_CHAT_APP_ID  = var.google_chat_app_id
    }
  }

  depends_on = [aws_cloudwatch_log_group.google_lambda]
}

# ─── Cron Lambda ──────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "cron_lambda" {
  name              = "/aws/lambda/trainee-2026-rifat-cron-lambda-v2"
  retention_in_days = 14
}

resource "aws_lambda_function" "cron" {
  function_name = "trainee-2026-rifat-cron-lambda-v2"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = var.image_uri
  timeout       = 30
  memory_size   = 256
  architectures = ["x86_64"]

  image_config {
    command = ["lambda.handler"]
  }

  environment {
    variables = {
      DISCORD_WEBHOOK_URL     = var.discord_webhook_url
      DYNAMODB_TABLE_MAIN     = var.dynamodb_table_name
      GOOGLE_CHAT_WEBHOOK_URL = var.google_chat_webhook_url
    }
  }

  depends_on = [aws_cloudwatch_log_group.cron_lambda]
}

# ─── EventBridge Schedules ────────────────────────────────────────────────────

resource "aws_scheduler_schedule" "create_meal_records" {
  name = "trainee-2026-rifat-cron-create-meal-records"

  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 10
  }

  schedule_expression          = "cron(0 21 ? * SUN-THU *)"
  schedule_expression_timezone = "Asia/Dhaka"
  state                        = "DISABLED"

  target {
    arn      = aws_lambda_function.cron.arn
    role_arn = aws_iam_role.cron_scheduler_role.arn
    input    = jsonencode({ type = "CREATE_RECORDS" })

    retry_policy {
      maximum_event_age_in_seconds = 86400
      maximum_retry_attempts       = 0
    }
  }
}

resource "aws_scheduler_schedule" "send_report" {
  name = "trainee-2026-rifat-cron-send-report"

  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 10
  }

  schedule_expression          = "cron(0 9 ? * MON-FRI *)"
  schedule_expression_timezone = "Asia/Dhaka"
  state                        = "DISABLED"

  target {
    arn      = aws_lambda_function.cron.arn
    role_arn = aws_iam_role.cron_scheduler_role.arn
    input    = jsonencode({ type = "SEND_REPORT" })

    retry_policy {
      maximum_event_age_in_seconds = 86400
      maximum_retry_attempts       = 0
    }
  }
}
