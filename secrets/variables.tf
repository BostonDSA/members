variable auth_host {
  description = "Auth service host."
  default     = "https://auth.dsausa.org"
}

variable auth0_audience {
  description = "Auth0 client ID."
}

variable auth0_domain {
  description = "Auth0 domain."
  default     = "dsausa.auth0.com"
}

variable auth0_session_secret {
  description = "Auth0 session secret string."
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

variable host {
  description = "Service host."
  default     = "https://members.bostondsa.org"
}

variable release {
  description = "Release tag."
}

variable repo {
  description = "Project repository."
  default     = "https://github.com/BostonDSA/members"
}

variable secret_description {
  description = "SecretsManager secret description."
  default     = "members.bostondsa.org secrets"
}

variable secret_name {
  description = "SecretsManager secret name."
  default     = "members"
}

variable slack_token {
  description = "Slack bot token."
}

variable slack_url {
  description = "Slack URL."
}
