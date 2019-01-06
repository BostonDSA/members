'use strict';
const dotenv = require('dotenv');
const express = require('express');
const expressJwt = require('express-jwt');
const expressSession = require('express-session');
const jwksRsa = require('jwks-rsa');
const request = require('request-promise');
const url = require('url');

dotenv.config();

const AUTH_HOST = process.env.AUTH_HOST;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_SESSION_SECRET = process.env.AUTH0_SESSION_SECRET;
const HOST = process.env.HOST;

const app = express();
const session = expressSession({
  secret: AUTH0_SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
});
const secret = jwksRsa.expressJwtSecret({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});
const getToken = (req) => {
  if (req.session && req.session.token) {
    return req.session.token;
  } else if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
};
const checkJwt = expressJwt({
  secret: secret,
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  getToken: getToken,
});

app.set('view engine', 'ejs');
app.use(session);
app.use(express.static('./views'));
app.use((req, res, next) => {
  if (req.query && req.query.token) {
    req.session.token = req.query.token;
    res.redirect(url.parse(req.originalUrl).pathname);
  } else {
    next();
  }
});

app.get('/', (req, res) => { res.redirect('/home'); });

app.get('/home', checkJwt, (req, res) => {
  res.render('index', {
    email: req.user.email,
    user: JSON.stringify(req.user, null, 2),
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  var redir = encodeURIComponent(`${HOST}/home`);
  res.redirect(`${AUTH_HOST}/logout?r=${redir}`);
});

app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    console.error(err);
    var redir = url.parse(req.originalUrl, true);
    redir.scheme = redir.scheme || 'https';
    redir.host = redir.host || HOST;
    redir.query.token = undefined;
    redir = `${AUTH_HOST}/auth?r=${encodeURIComponent(redir.format())}`;
    console.log(`AUTH ${redir}`);
    res.redirect(redir);
  }
});

module.exports = app;
