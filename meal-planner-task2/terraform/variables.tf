variable "aws_region" {
  default = "ap-southeast-1"
}

variable "account_id" {
  default = "211125488712"
}

variable "dynamodb_table_name" {
  default = "trainee-2026-rifat-mhp-v2"
}

variable "discord_public_key" {
  sensitive = true
}

variable "google_chat_app_id" {
  sensitive = true
}

variable "discord_webhook_url" {
  sensitive = true
}

variable "google_chat_webhook_url" {
  sensitive = true
}
