output "public_ip" {
  value = aws_instance.backend.public_ip
}

output "api_url" {
  value = "http://${aws_instance.backend.public_ip}:5000/health"
}

output "swagger_url" {
  value = "http://${aws_instance.backend.public_ip}:5000/docs"
}
