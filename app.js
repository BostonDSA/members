'use strict';
const AWS            = require('aws-sdk');
const bodyParser     = require('body-parser');
const express        = require('express');
const Keycloak       = require('keycloak-connect');
const url            = require('url');
const { WebClient }  = require('@slack/web-api');

const session        = require('express-session');
const MemoryStore    = require('memorystore')(session);

const slack = new WebClient(process.env.SLACK_TOKEN);
const SNS   = new AWS.SNS();
const s3   = new AWS.S3();

const AUTH_HOST            = process.env.AUTH_HOST;
const HOST                 = process.env.HOST;
const SLACK_URL            = process.env.SLACK_URL;
const SLACK_INVITE_CHANNEL = process.env.SLACK_INVITE_CHANNEL;
const SLACK_TOPIC_ARN      = process.env.SLACK_TOPIC_ARN;
const AWS_BUCKET           = process.env.AWS_BUCKET;

const ROWS = [
  {
    header: 'Member Resources',
    cards: [
      [
        {
          alt:      'Calendar Logo',
          bg:       '#821d1d',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/5/56/Apple_Calendar_Icon.png',
          subtitle: 'Chapter Events',
          title:    'Calendar',
          url:      'https://www.bostondsa.org/events/',
        },
        {
          alt:      'Wiki Logo',
          bg:       '#fff',
          icon:     'https://wiki.bostondsa.org/w/resources/assets/rose.jpg',
          subtitle: 'Chapter knowledge base',
          title:    'Wiki',
          url:      'https://wiki.bostondsa.org/',
        },
        {
          alt:      'Discord Logo',
          bg:       '#5865F2',
          icon:     'https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Discord_logo.svg/320px-Discord_logo.svg.png',
          subtitle: 'Chapter chat',
          style:    'height: 30px;',
          title:    'Discord',
          url:      'https://discord.gg/FpdWcFFwXC',
        }
      ],
      [
        {
          alt:      'Zoom Logo',
          bg:       '#d0dff7',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Zoom_Communications_Logo.svg/320px-Zoom_Communications_Logo.svg.png',
          style:    'height: 30px;',
          subtitle: 'Virtual Meetings',
          title:    'Zoom',
          url:      '/home/zoom',
        },
        {
          alt:      'Admin Requests Form',
          bg:       '#eeeeee',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/a/a1/Google_docs.png',
          subtitle: 'Reimbursements, outreach, endorsements, tech support, and more',
          title:    'Admin Requests',
          url:      'https://airtable.com/shrGf4B4DaW0WIwoO',
        }
      ]
    ]
  },
  {
    header: 'New Member Guides',
    cards: [
      [
        {
          alt:      'New Member Handbook',
          bg:       '#b71c1c',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Book_icon_%28closed%29_-_Red_and_gold.svg/137px-Book_icon_%28closed%29_-_Red_and_gold.svg.png',
          subtitle: 'New Member Handbook',
          title:    'New Member Handbook',
          url:      'https://sites.google.com/view/boston-dsa-new-member-handbook/home',
        },
        {
          alt:      'Chapter Orientations',
          bg:       '#1565c0',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Compass_icon_matte.svg/240px-Compass_icon_matte.svg.png',
          subtitle: 'Chapter Orientations',
          title:    'Orientation',
          url:      'https://actionnetwork.org/campaigns/boston-dsa-member-orientations',
        },
      ]
    ]
  },
  {
    header: 'Find us',
    cards: [
      [
        {
          alt:      'Website Logo',
          bg:       '#f00',
          icon:     'https://pbs.twimg.com/profile_images/891003621822910464/Pdp_UUB__400x400.jpg',
          subtitle: 'bostondsa.org',
          title:    'Website',
          url:      'https://bostondsa.org/',
        },
        {
          alt:      'Facebook Logo',
          bg:       '#40516e',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Facebook_f_logo_%282019%29.svg/240px-Facebook_f_logo_%282019%29.svg.png',
          subtitle: 'Facebook',
          title:    'Facebook',
          url:      'https://www.facebook.com/BostonDSA',
        },
        {
          alt:      'Instagram Logo',
          bg:       '#e9c2ed',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/132px-Instagram_logo_2016.svg.png',
          subtitle: 'Instagram',
          title:    'Instagram',
          url:      'https://www.instagram.com/boston_dsa/',
        }
      ],
      [
        {
          alt:      'Twitter Logo',
          bg:       '#775b7b',
          icon:     'https://upload.wikimedia.org/wikipedia/it/archive/0/09/20160903181541!Twitter_bird_logo.png',
          subtitle: 'Follow us on Twitter',
          title:    'Twitter',
          url:      'https://twitter.com/Boston_DSA',
        },
      ]
    ]
  },

]

const keycloakConfig = {
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  serverUrl: process.env.KEYCLOAK_URL,
  realm: process.env.KEYCLOAK_REALM,
  secret: process.env.KEYCLOAK_CLIENT_SECRET
};

const memoryStore = new MemoryStore({checkPeriod: 86400000});

const app     = express();
const keycloak = new Keycloak(
  {
    store: memoryStore
  },
  keycloakConfig
);

app.set('view engine', 'ejs');
app.enable('trust proxy')

app.use(session({
  secret: 'mySecret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));
app.use(keycloak.middleware());
app.use(express.static('./views'));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.redirect('/home');
});

app.get('/home', keycloak.protect(), (req, res) => {
  res.render('index', {email: req.kauth.grant.access_token.content.email, rows: ROWS});
});

app.get('/home/slack', keycloak.protect(), (req, res) => {
  slack.users.lookupByEmail({email: req.kauth.grant.access_token.content.email}).then(() => {
    res.redirect(SLACK_URL);
  }).catch((err) => {
    res.redirect('/home/slack/join');
  });
});

app.get('/home/slack/join', keycloak.protect(), (req, res) => {
  res.render('slack', {email: req.kauth.grant.access_token.content.email, alert: undefined});
});

app.post('/home/slack/join', keycloak.protect(), (req, res) => {
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
            value: req.kauth.grant.access_token.content.email,
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
            value: req.kauth.grant.access_token.content.email,
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
      email: req.kauth.grant.access_token.content.email,
      alert: {
        text: 'Thanks! Your request is being reviewed by the Slack moderators',
        cls:  'good',
      },
    });
  }).catch((err) => {
    console.error(JSON.stringify(err));
    res.render('slack', {
      email: req.kauth.grant.access_token.content.email,
      alert: {
        text: 'Oops, something went wrong. Email tech@bostondsa.org to report the problem.',
        cls:  'error',
      },
    });
  });
})

app.get('/home/zoom', keycloak.protect(), (req, res) => {
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

module.exports = app;
