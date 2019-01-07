provider aws {
  access_key = "${var.aws_access_key_id}"
  secret_key = "${var.aws_secret_access_key}"
  profile    = "${var.aws_profile}"
  region     = "${var.aws_region}"
  version    = "~> 1.54"
}

locals {
  secret {
    AUTH0_AUDIENCE       = "${var.auth0_audience}"
    AUTH0_DOMAIN         = "${var.auth0_domain}"
    AUTH0_SESSION_SECRET = "${var.auth0_session_secret}"
    AUTH_HOST            = "${var.auth_host}"
    HOST                 = "${var.host}"
    SLACK_TOKEN          = "${var.slack_token}"
    SLACK_URL            = "${var.slack_url}"
  }

  tags {
    App     = "members"
    Repo    = "${var.repo}"
    Release = "${var.release}"
  }
}

resource aws_secretsmanager_secret secret {
  description = "${var.secret_description}"
  name        = "${var.secret_name}"
  tags        = "${local.tags}"
}

resource aws_secretsmanager_secret_version version {
  secret_id     = "${aws_secretsmanager_secret.secret.id}"
  secret_string = "${jsonencode(local.secret)}"
}
