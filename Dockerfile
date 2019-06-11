ARG RUNTIME=nodejs8.10

FROM lambci/lambda:build-${RUNTIME}
COPY --from=hashicorp/terraform:0.12.1 /bin/terraform /bin/
COPY . .
RUN npm install --production
