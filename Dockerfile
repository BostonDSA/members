ARG RUNTIME=nodejs10.x
ARG TERRAFORM_VERSION=0.12.5

FROM lambci/lambda:build-${RUNTIME} AS build
COPY . .
RUN npm install --production
RUN zip -r package.zip *.js node_modules package*.json views

FROM hashicorp/terraform:${TERRAFORM_VERSION} AS plan
WORKDIR /var/task/
COPY --from=build /var/task/package.zip .
COPY terraform.tf .
ARG AWS_ACCESS_KEY_ID
ARG AWS_DEFAULT_REGION=us-east-1
ARG AWS_SECRET_ACCESS_KEY
ARG TF_VAR_release
RUN terraform init
RUN terraform fmt -check
RUN terraform plan -out terraform.zip
CMD ["apply", "terraform.zip"]
