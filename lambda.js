'use strict';
const awsServerlessExpress = require('aws-serverless-express');
const secret = process.env.AWS_SECRET;

let server;

function fetchEnv (name) {
  console.log(`GET ${name}`);
  const AWS = require('aws-sdk');
  const secretsmanager = new AWS.SecretsManager();
  return secretsmanager.getSecretValue({SecretId: name}).promise().then((data) => {
    const env = JSON.parse(data.SecretString);
    Object.keys(env).map((key) => { process.env[key] = env[key]; });
    return env;
  });
}

function getServer () {
  if (server) {
    return Promise.resolve(server);
  } else {
    return fetchEnv(secret).then((env) => {
      const app = require('./app');
      server = awsServerlessExpress.createServer(app);
      return server;
    });
  }
}

exports.handler = (event, context) => {
  console.log(`EVENT ${JSON.stringify(event)}`);
  getServer().then((server) => awsServerlessExpress.proxy(server, event, context));
};
