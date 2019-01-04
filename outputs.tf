output url {
  description = "App URL."
  value       = "https://${aws_api_gateway_domain_name.domain.domain_name}"
}
