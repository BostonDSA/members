'use strict';
const AWS                  = require('aws-sdk');
const awsServerlessExpress = require('aws-serverless-express');

const AWS_SECRET = process.env.AWS_SECRET;

const secretsmanager = new AWS.SecretsManager();

let server;

const getServer = async (options) => {
  const secret = await secretsmanager.getSecretValue(options).promise();
  Object.assign(process.env, JSON.parse(secret.SecretString));
  server = awsServerlessExpress.createServer(require('./app'));
  return server;
};

exports.handler = (event, context) => {
  console.log(`EVENT ${JSON.stringify(event)}`);
  Promise.resolve(server || getServer({SecretId: AWS_SECRET})).then((server) => {
    awsServerlessExpress.proxy(server, event, context);
  });
};
