# ── Data source: account ID (needed for SQS URI path) ─────────────────────────
data "aws_caller_identity" "current" {}

# ── IAM: allow API Gateway to call SQS ────────────────────────────────────────
resource "aws_iam_role" "apigw_sqs_role" {
  name = "${var.project_name}-apigw-sqs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "apigw_sqs" {
  name = "${var.project_name}-apigw-sqs"
  role = aws_iam_role.apigw_sqs_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = aws_sqs_queue.main.arn
    }]
  })
}

# ── REST API ───────────────────────────────────────────────────────────────────
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api"
  description = "Receives JSON from CloudFront and forwards to SQS"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# /api
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "api"
}

# /api/messages
resource "aws_api_gateway_resource" "messages" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "messages"
}

# POST /api/messages?type=<value>
# type is passed as a query param so it maps to the SQS message attribute
# independently of the body, which can be any content (including non-JSON).
resource "aws_api_gateway_method" "post_message" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.messages.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.querystring.type" = false
  }
}

# ── Integration: POST /api/messages → SQS SendMessage ─────────────────────────
# API Gateway AWS integrations use URL-encoded form bodies, not JSON.
# The VTL template maps incoming JSON fields to SQS query parameters.
# type is sent as a SQS message attribute so the Step Function can route it.
resource "aws_api_gateway_integration" "sqs" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.messages.id
  http_method             = aws_api_gateway_method.post_message.http_method
  type                    = "AWS"
  integration_http_method = "POST"
  credentials             = aws_iam_role.apigw_sqs_role.arn

  uri = "arn:aws:apigateway:${var.aws_region}:sqs:path/${data.aws_caller_identity.current.account_id}/${aws_sqs_queue.main.name}"

  request_parameters = {
    "integration.request.header.Content-Type" = "'application/x-www-form-urlencoded'"
  }

  request_templates = {
    # type is read from the query string (?type=good) so the body can be
    # any content — including non-JSON — enabling the DLQ retry scenario.
    "application/json" = trimspace(<<-EOT
      Action=SendMessage&QueueUrl=$util.urlEncode("${aws_sqs_queue.main.url}")&MessageBody=$util.urlEncode($input.body)&MessageAttribute.1.Name=type&MessageAttribute.1.Value.DataType=String&MessageAttribute.1.Value.StringValue=$util.urlEncode($input.params('type'))
    EOT
    )
  }
}

# ── Method + integration responses ────────────────────────────────────────────
resource "aws_api_gateway_method_response" "post_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.messages.id
  http_method = aws_api_gateway_method.post_message.http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "sqs_200" {
  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = aws_api_gateway_resource.messages.id
  http_method       = aws_api_gateway_method.post_message.http_method
  status_code       = aws_api_gateway_method_response.post_200.status_code
  selection_pattern = ""

  response_templates = {
    "application/json" = jsonencode({ message = "Message queued successfully" })
  }

  depends_on = [aws_api_gateway_integration.sqs]
}

# ── Deployment + Stage ─────────────────────────────────────────────────────────
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  # Hash actual content (not just IDs) so any VTL or method change triggers redeploy
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.sqs.uri,
      aws_api_gateway_integration.sqs.request_templates,
      aws_api_gateway_integration.sqs.request_parameters,
      aws_api_gateway_method.post_message.request_parameters,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.sqs,
    aws_api_gateway_integration_response.sqs_200,
  ]
}

resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"
}
