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

Deployment should happen automatically by tagging the project and pushing to GitHub, but the project can be deployed manually as well:

- `make` builds a Docker image that generates:
  - An updated `package-lock.json` file (if applicable)
  - A `package.zip` file with the AWS Lambda package contents
  - A `.docker/` directory to keep track of your built images
- `make apply` applies the changes to production (danger!)
- `make clean` cleans up untracked artifacts

Alternatively, you can deploy with terraform:

- `make package.zip` will generate the Lambda package
- `terraform init` initializes the project
- `terraform plan` outputs the proposed changes
- `terraform apply` applies them (with a prompt)
- `make clean` cleans up untracked artifacts
