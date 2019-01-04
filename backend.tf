terraform {
  backend s3 {
    bucket  = "terraform.bostondsa.org"
    key     = "members.tfstate"
    region  = "us-east-1"
    profile = "bdsa"
  }
}
