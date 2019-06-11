ARG RUNTIME=nodejs8.10

FROM lambci/lambda:build-${RUNTIME}

COPY --from=hashicorp/terraform:0.12.1 /bin/terraform /bin/
COPY . .

ARG AWS_ACCESS_KEY_ID
ARG AWS_DEFAULT_REGION=us-east-1
ARG AWS_SECRET_ACCESS_KEY
ARG TF_VAR_release

RUN npm install --production
RUN zip -r package.zip *.js node_modules package*.json views
RUN terraform init
RUN terraform fmt -check
RUN terraform plan -out terraform.zip

CMD ["terraform", "apply", "terraform.zip"]
