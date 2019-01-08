variable api_name {
  description = "API Gateway REST API name."
  default     = "members"
}

variable aws_access_key_id {
  description = "AWS access key ID."
  default     = ""
}

variable aws_profile {
  description = "AWS profile."
  default     = ""
}

variable aws_region {
  description = "AWS region."
  default     = "us-east-1"
}

variable aws_secret_access_key {
  description = "AWS secret access key."
  default     = ""
}

variable acm_certificate_domain {
  description = "ACM certificate domain."
  default     = "members.bostondsa.org"
}

variable lambda_function_name {
  description = "Lambda function name."
  default     = "members"
}

variable release {
  description = "Release tag."
}

variable repo {
  description = "Project repository."
  default     = "https://github.com/BostonDSA/members.git"
}

variable role_name {
  description = "IAM role name."
  default     = "members"
}

variable secret_name {
  description = "SecretsManager secret name."
  default     = "members"
}
