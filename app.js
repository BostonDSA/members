'use strict';
const AWS            = require('aws-sdk');
const bodyParser     = require('body-parser');
const express        = require('express');
const expressJwt     = require('express-jwt');
const expressSession = require('express-session');
const jwksRsa        = require('jwks-rsa');
const url            = require('url');
const { WebClient }  = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_TOKEN);
const SNS   = new AWS.SNS();
const s3   = new AWS.S3();

const AUTH_HOST            = process.env.AUTH_HOST;
const AUTH0_AUDIENCE       = process.env.AUTH0_AUDIENCE;
const AUTH0_DOMAIN         = process.env.AUTH0_DOMAIN;
const AUTH0_SESSION_SECRET = process.env.AUTH0_SESSION_SECRET;
const HOST                 = process.env.HOST;
const SLACK_URL            = process.env.SLACK_URL;
const SLACK_INVITE_CHANNEL = process.env.SLACK_INVITE_CHANNEL;
const SLACK_TOPIC_ARN      = process.env.SLACK_TOPIC_ARN;
const AWS_BUCKET           = process.env.AWS_BUCKET;

const CARDS = {
  website: {
    alt:      'Website Logo',
    bg:       '#f00',
    icon:     'https://pbs.twimg.com/profile_images/891003621822910464/Pdp_UUB__400x400.jpg',
    subtitle: 'bostondsa.org',
    title:    'Website',
    url:      'https://bostondsa.org/',
  },
  wiki: {
    alt:      'Wiki Logo',
    bg:       '#fff',
    icon:     'https://wiki.bostondsa.org/w/resources/assets/rose.jpg',
    subtitle: 'Chapter knowledge base',
    title:    'Wiki',
    url:      'https://wiki.bostondsa.org/',
  },
  calendar: {
    alt:      'Calendar Logo',
    bg:       '#821d1d',
    icon:     'https://upload.wikimedia.org/wikipedia/commons/5/56/Apple_Calendar_Icon.png',
    subtitle: 'Chapter Events',
    title:    'Calendar',
    url:      'https://www.bostondsa.org/events/',
  },
  slack: {
    alt:      'Slack Logo',
    bg:       '#ff4f4f',
    icon:     'https://upload.wikimedia.org/wikipedia/commons/7/76/Slack_Icon.png',
    subtitle: 'Join the conversation',
    title:    'Slack',
    url:      '/home/slack',
  },
  twitter: {
    alt:      'Twitter Logo',
    bg:       '#775b7b',
    icon:     'https://upload.wikimedia.org/wikipedia/it/archive/0/09/20160903181541!Twitter_bird_logo.png',
    subtitle: 'Follow us on Twitter',
    title:    'Twitter',
    url:      'https://twitter.com/Boston_DSA',
  },
  blog: {
    alt:      'Blog Logo',
    bg:       '#f8b195',
    icon:     'https://i2.wp.com/bostonpewg.org/wp-content/uploads/2018/03/cropped-pewglogo1.png',
    style:    'height: 91px;',
    subtitle: 'Political Education Blog',
    title:    'Blog',
    url:      'https://bostonpewg.org/',
  },
  vote: {
    alt:      'Vote',
    bg:       '#ea290b',
    icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Ballot_box_icon_color.svg/1006px-Ballot_box_icon_color.svg.png',
    style:    'height: 91px;',
    subtitle: 'Chapter Voting Discussion',
    title:    'Voting Discussion',
    url:      'https://vote.bostondsa.org/'
  },
  zoom: {
    alt:      'Zoom Logo',
    bg:       '#d0dff7',
    icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Zoom_Communications_Logo.svg/320px-Zoom_Communications_Logo.svg.png',
    style:    'height: 30px;',
    subtitle: 'Virtual Meetings',
    title:    'Zoom',
    url:      '/home/zoom',
  },
  facebook: {
    alt:      'Facebook Logo',
    bg:       '#40516e',
    icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Facebook_f_logo_%282019%29.svg/240px-Facebook_f_logo_%282019%29.svg.png',
    subtitle: 'Facebook',
    title:    'Facebook',
    url:      'https://www.facebook.com/BostonDSA',
  },
  instagram: {
    alt:      'Instagram Logo',
    bg:       '#e9c2ed',
    icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/132px-Instagram_logo_2016.svg.png',
    subtitle: 'Instagram',
    title:    'Instagram',
    url:      'https://www.instagram.com/boston_dsa/',
  },
  handbook: {
    alt:      'New Member Handbook',
    bg:       '#eeeeee',
    icon:     'https://lh3.googleusercontent.com/vK2eHGgFULWa4G5Nwo6x-_GAgFpjnDPC0ELuGQd6GHLtoKHWXvLK-f1RYuVPFEDHRkGZGnN7clE1l6g4ZNCOeYPXkiZ2NV-_1QrIwdJXXLtVHrrYNDLY69wNIvj28HngNw=w1280',
    subtitle: 'New Member Handbook',
    title:    'Information for new members!',
    url:      'https://sites.google.com/view/boston-dsa-new-member-handbook/home',
  },
};
const ROWS = [
  Object.values(CARDS).slice(0, 3),
  Object.values(CARDS).slice(3, 6),
  Object.values(CARDS).slice(6, 9),
  Object.values(CARDS).slice(9, 12),
];

const app     = express();
const session = expressSession({
  secret:            AUTH0_SESSION_SECRET,
  resave:            false,
  saveUninitialized: true,
});
const secret = jwksRsa.expressJwtSecret({
  cache:                 true,
  rateLimit:             true,
  jwksRequestsPerMinute: 5,
  jwksUri:               `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});
const getToken = (req) => {
  if (req.session && req.session.token) {
    return req.session.token;
  } else if (req.query && req.query.token) {
    return req.query.token;
  } else {
    return null;
  }
};
const checkJwt = expressJwt({
  secret:     secret,
  audience:   AUTH0_AUDIENCE,
  issuer:     `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  getToken:   getToken,
});

app.set('view engine', 'ejs');
app.use(session);
app.use(express.static('./views'));
app.use((req, res, next) => {
  if (req.query && req.query.token) {
    console.log(`REDIRECT ${req.originalUrl}`)
    req.session.token = req.query.token;
    res.redirect(url.parse(req.originalUrl).pathname);
  } else {
    next();
  }
});
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.redirect('/home');
});

app.get('/home', checkJwt, (req, res) => {
  res.render('index', {email: req.user.email, rows: ROWS});
});

app.get('/home/slack', checkJwt, (req, res) => {
  slack.users.lookupByEmail({email: req.user.email}).then(() => {
    res.redirect(SLACK_URL);
  }).catch((err) => {
    res.redirect('/home/slack/join');
  });
});

app.get('/home/slack/join', checkJwt, (req, res) => {
  res.render('slack', {email: req.user.email, alert: undefined});
});

app.post('/home/slack/join', checkJwt, (req, res) => {
  const message = {
    channel: SLACK_INVITE_CHANNEL,
    text: 'A new DSA member is requesting to join Slack',
    attachments: [
      {
        color: 'b71c1c',
        fallback: 'A new DSA member is requesting to join Slack',
        fields: [
          {
            title: 'Name',
            value: req.body.name,
            short: true,
          },
          {
            title: 'Email',
            value: req.user.email,
            short: true,
          }
        ],
        footer: '<https://github.com/BostonDSA/socialismbot|BostonDSA/socialismbot>',
        footer_icon: 'https://assets-cdn.github.com/favicon.ico',
      },
      {
        color: 'b71c1c',
        callback_id: 'invite',
        fallback:    'A new DSA member is requesting to join Slack',
        actions: [
          {
            confirm: {
              title:   'Are you sure?',
              text:    `${req.body.name} *will* be invited to Slack`,
              ok_text: 'Yes',
            },
            name:  'invite',
            text:  'Invite',
            type:  'button',
            value: req.user.email,
          },
          {
            confirm: {
              title:   'Are you sure?',
              text:    `${req.body.name} *will not* be invited to Slack`,
              ok_text: 'Yes',
            },
            name:  'dismiss',
            style: 'danger',
            text:  'Dismiss',
            type:  'button',
          }
        ],
        text: 'Invite or dismiss?',
      }
    ],
  }
  SNS.publish({
    TopicArn: SLACK_TOPIC_ARN,
    Message:  JSON.stringify(message),
    MessageAttributes: {
      id: {
        DataType: 'String',
        StringValue: 'postMessage',
      },
      type: {
        DataType: 'String',
        StringValue: 'chat',
      },
    },
  }).promise().then(() => {
    res.render('slack', {
      email: req.user.email,
      alert: {
        text: 'Thanks! Your request is being reviewed by the Slack moderators',
        cls:  'good',
      },
    });
  }).catch((err) => {
    console.error(JSON.stringify(err));
    res.render('slack', {
      email: req.user.email,
      alert: {
        text: 'Oops, something went wrong. Email tech@bostondsa.org to report the problem.',
        cls:  'error',
      },
    });
  });
})

app.get('/home/zoom', checkJwt, (req, res) => {
  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: 'zoom_meetings.json'
  };
  s3.getObject(params, (err, data) => {
    if (err) {
      console.error(err);
    } else {
      let meetings = JSON.parse(data.Body);
      res.render('zoom', {meetings: meetings});
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  const redir = encodeURIComponent(`${HOST}/home`);
  res.redirect(`${AUTH_HOST}/logout?r=${redir}`);
});

app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    console.error(err);
    var redir = url.parse(req.originalUrl, true);
    redir.scheme      = redir.scheme || 'https';
    redir.host        = redir.host || HOST;
    redir.query.token = undefined;
    redir = `${AUTH_HOST}/auth?r=${encodeURIComponent(redir.format())}`;
    console.log(`REDIRECT ${redir}`);
    res.redirect(redir);
  }
});

module.exports = app;
