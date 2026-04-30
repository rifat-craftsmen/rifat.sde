# ─── Build Artifacts ──────────────────────────────────────────────────────────

data "archive_file" "discord_authorizer" {
  type        = "zip"
  source_file = "${path.module}/../backend/dist/discordAuthorizer.js"
  output_path = "${path.module}/../backend/dist/discordAuthorizer.zip"
}

data "archive_file" "discord_main" {
  type        = "zip"
  source_file = "${path.module}/../backend/dist/discordLambda.js"
  output_path = "${path.module}/../backend/dist/discordLambda.zip"
}

data "archive_file" "google_main" {
  type        = "zip"
  source_file = "${path.module}/../backend/dist/googleLambda.js"
  output_path = "${path.module}/../backend/dist/googleLambda.zip"
}

data "archive_file" "cron" {
  type        = "zip"
  source_file = "${path.module}/../backend/dist/cron.js"
  output_path = "${path.module}/../backend/dist/cron.zip"
}

data "archive_file" "layer" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/layer"
  output_path = "${path.module}/../backend/artifacts/layer.zip"
}

# ─── Lambda Layer ─────────────────────────────────────────────────────────────

resource "aws_lambda_layer_version" "deps" {
  filename                 = data.archive_file.layer.output_path
  layer_name               = "trainee-2026-rifat-deps"
  compatible_runtimes      = ["nodejs22.x"]
  compatible_architectures = ["x86_64"]
  source_code_hash         = data.archive_file.layer.output_base64sha256
}

# ─── Discord Authorizer ───────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "discord_authorizer" {
  name              = "/aws/lambda/trainee-2026-rifat-discord-authorizer-v2"
  retention_in_days = 14
}

resource "aws_lambda_function" "discord_authorizer" {
  function_name    = "trainee-2026-rifat-discord-authorizer-v2"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs22.x"
  handler          = "discordAuthorizer.handler"
  filename         = data.archive_file.discord_authorizer.output_path
  source_code_hash = data.archive_file.discord_authorizer.output_base64sha256
  layers           = [aws_lambda_layer_version.deps.arn]
  timeout          = 10
  memory_size      = 128
  architectures    = ["x86_64"]

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
  function_name    = "trainee-2026-rifat-discord-lambda-v2"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs22.x"
  handler          = "discordLambda.handler"
  filename         = data.archive_file.discord_main.output_path
  source_code_hash = data.archive_file.discord_main.output_base64sha256
  layers           = [aws_lambda_layer_version.deps.arn]
  timeout          = 30
  memory_size      = 512
  architectures    = ["x86_64"]

  environment {
    variables = {
      DISCORD_PUBLIC_KEY  = var.discord_public_key
      DYNAMODB_TABLE_MAIN = var.dynamodb_table_name
    }
  }

  depends_on = [aws_cloudwatch_log_group.discord_lambda]
}

# ─── Google Main ──────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "google_lambda" {
  name              = "/aws/lambda/trainee-2026-rifat-google-lambda-v2"
  retention_in_days = 14
}

resource "aws_lambda_function" "google_main" {
  function_name    = "trainee-2026-rifat-google-lambda-v2"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs22.x"
  handler          = "googleLambda.handler"
  filename         = data.archive_file.google_main.output_path
  source_code_hash = data.archive_file.google_main.output_base64sha256
  layers           = [aws_lambda_layer_version.deps.arn]
  timeout          = 30
  memory_size      = 256
  architectures    = ["x86_64"]

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
  function_name    = "trainee-2026-rifat-cron-lambda-v2"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs22.x"
  handler          = "cron.handler"
  filename         = data.archive_file.cron.output_path
  source_code_hash = data.archive_file.cron.output_base64sha256
  layers           = [aws_lambda_layer_version.deps.arn]
  timeout          = 30
  memory_size      = 256
  architectures    = ["x86_64"]

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
  state                        = "ENABLED"

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
  state                        = "ENABLED"

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
