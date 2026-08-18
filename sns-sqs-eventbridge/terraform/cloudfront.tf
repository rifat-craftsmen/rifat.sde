# ── CloudFront Distribution ────────────────────────────────────────────────────
# Single entry point: d<id>.cloudfront.net
#   /*      → S3 bucket (React SPA, via OAC)
#   /api/*  → API Gateway (cache disabled, forwards to SQS)

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_All"
  comment             = "${var.project_name} SPA + API gateway"

  # ── Origin 1: S3 (React SPA) ────────────────────────────────────────────────
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # ── Origin 2: API Gateway ────────────────────────────────────────────────────
  # origin_path prepends /prod so CloudFront forwards
  # /api/messages → https://<apigw>.execute-api.../prod/api/messages
  origin {
    domain_name = "${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com"
    origin_id   = "apigw"
    origin_path = "/${aws_api_gateway_stage.main.stage_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ── Default behavior: S3 SPA (GET/HEAD only, caching on) ────────────────────
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # ── /api/* behavior: API Gateway (all methods, caching OFF) ─────────────────
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "apigw"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      headers      = ["Accept", "Content-Type"]
      cookies { forward = "none" }
    }

    # TTL 0 = never cache; every request reaches API Gateway
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # ── SPA fallback: S3 returns 403 for missing keys → serve index.html ────────
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}
