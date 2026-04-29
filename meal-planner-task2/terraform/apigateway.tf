resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/trainee-2026-rifat-mhp-v2"
  retention_in_days = 14
}

resource "aws_apigatewayv2_api" "main" {
  name                       = "trainee-2026-rifat-mhp-v2-api-gateway"
  protocol_type              = "HTTP"
  route_selection_expression = "$request.method $request.path"
}

# ─── Authorizers ──────────────────────────────────────────────────────────────

# Old Lambda authorizer — kept for reference, no longer used
# resource "aws_apigatewayv2_authorizer" "google" {
#   api_id                            = aws_apigatewayv2_api.main.id
#   authorizer_type                   = "REQUEST"
#   name                              = "google-authorizer-v2"
#   authorizer_uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.google_authorizer.arn}/invocations"
#   authorizer_payload_format_version = "2.0"
#   authorizer_result_ttl_in_seconds  = 300
#   enable_simple_responses           = false
#   identity_sources                  = ["$request.header.Authorization"]
# }

resource "aws_apigatewayv2_authorizer" "google_jwt" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  name             = "google-jwt-authorizer"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [var.google_chat_app_id]
    issuer   = "https://accounts.google.com"
  }
}

# ─── Integrations ─────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "discord" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.discord_main.arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_integration" "google" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.google_main.arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

# ─── Routes ───────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_route" "discord_interactions" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /discord/interactions"
  target    = "integrations/${aws_apigatewayv2_integration.discord.id}"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.discord.id}"
}

resource "aws_apigatewayv2_route" "google_interactions" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "ANY /google/interactions"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.google_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.google.id}"
}

# ─── Stage ────────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 300  # requests/sec steady state
    throttling_burst_limit = 300   # max burst
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format          = "{\"requestId\":\"$context.requestId\",\"path\":\"$context.path\",\"status\":\"$context.status\",\"error\":\"$context.error.message\"}\n"
  }
}

# ─── Lambda Permissions ───────────────────────────────────────────────────────

resource "aws_lambda_permission" "discord_apigw" {
  statement_id  = "AllowAPIGatewayInvokeDiscord"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.discord_main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "google_apigw" {
  statement_id  = "AllowAPIGatewayInvokeGoogle"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.google_main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "google_authorizer_apigw" {
  statement_id  = "AllowAPIGatewayInvokeGoogleAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.google_authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
