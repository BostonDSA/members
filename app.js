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

const CARDS = {
  website: {
    alt: 'Website Logo',
    bg: '#f00',
    icon: 'https://pbs.twimg.com/profile_images/891003621822910464/Pdp_UUB__400x400.jpg',
    subtitle: 'bostondsa.org',
    title: 'Website',
    url: 'https://bostondsa.org/',
  },
  wiki: {
    alt: 'Wiki Logo',
    bg: '#fff',
    icon: 'https://wiki.bostondsa.org/w/resources/assets/rose.jpg',
    subtitle: 'Chapter knowledge base',
    title: 'Wiki',
    url: 'https://wiki.bostondsa.org/',
  },
  calendar: {
    alt: 'Calendar Logo',
    bg: '#821d1d',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Apple_Calendar_Icon.png',
    subtitle: 'Subscribe to Chapter Calendar',
    title: 'Calendar',
    url: 'https://calendars.dsausa.org/u21m8kt8bb1lflp8jpmd317iik%40group.calendar.google.com',
  },
  slack: {
    alt: 'Slack Logo',
    bg: '#ff4f4f',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Slack_Icon.png',
    subtitle: 'Join the conversation',
    title: 'Slack',
    url: '/home/slack',
  },
  twitter: {
    alt: 'Twitter Logo',
    bg: '#775b7b',
    icon: 'https://upload.wikimedia.org/wikipedia/it/archive/0/09/20160903181541!Twitter_bird_logo.png',
    subtitle: 'Follow us on Twitter',
    title: 'Twitter',
    url: 'https://twitter.com/Boston_DSA',
  },
  blog: {
    alt: 'Blog Logo',
    bg: '#f8b195',
    icon: 'https://i2.wp.com/bostonpewg.org/wp-content/uploads/2018/03/cropped-pewglogo1.png',
    style: 'height: 91px;',
    subtitle: 'Political Education Blog',
    title: 'Blog',
    url: 'https://bostonpewg.org/',
  },
};
const ROWS = [Object.values(CARDS).slice(0, 3), Object.values(CARDS).slice(3, 6)];

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
  res.render('index', {email: req.user.email, rows: ROWS});
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
