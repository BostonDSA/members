# Boston DSA Member Portal

Chapter portal


## Requirements

- Docker (for [Windows](https://docs.docker.com/docker-for-windows/) or [macOS](https://docs.docker.com/docker-for-mac/))
- [Make](https://www.gnu.org/software/make/manual/make.html)
- [Terraform](https://terraform.io) (optional)

## Development

- Copy `.env.example` to `.env` and fill in the proper values
- Run `npm install` to install NodeJS dependencies from `package.json`
- Run `npm start` to start a development server

## Deploy

- Run `make` to build a Docker image that generates:
  - An updated `package-lock.json` file (if applicable)
  - A `package.zip` file with the AWS Lambda package contents
  - A `.docker/` directory to keep track of your built images
- Run `make apply` to apply the changes to production

Alternatively, you can deploy manually with terraform:

- Run `make` to generate `package.zip`
- Run `terraform init` to initialize the project
- Run `terraform plan` to review the changes
- Run `terraform apply` to apply them
