ARG RUNTIME=nodejs12.x
FROM lambci/lambda:build-${RUNTIME}
COPY . .
RUN npm install --production
RUN zip -r package.zip *.js node_modules package*.json views
