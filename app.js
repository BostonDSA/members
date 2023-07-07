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
          alt:      'Slack Logo',
          bg:       '#ff4f4f',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/7/76/Slack_Icon.png',
          subtitle: 'Join the conversation',
          title:    'Slack',
          url:      '/home/slack',
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
          alt:      'Vote',
          bg:       '#ea290b',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Ballot_box_icon_color.svg/1006px-Ballot_box_icon_color.svg.png',
          style:    'height: 91px;',
          subtitle: 'Chapter Voting Discussion',
          title:    'Voting Discussion',
          url:      'https://vote.bostondsa.org/'
        }
      ]
    ]
  },
  {
    header: 'How To Do Things',
    cards: [
      [
        {
          alt:      'Request an endorsement',
          bg:       '#eeeeee',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/a/a1/Google_docs.png',
          subtitle: 'Request an endorsement',
          title:    'Endorsements',
          url:      'https://airtable.com/shrGf4B4DaW0WIwoO',
        },
        {
          alt:      'Request funding',
          bg:       '#eeeeee',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/a/a1/Google_docs.png',
          subtitle: 'Request funding',
          title:    'Funding',
          url:      'https://airtable.com/shrGf4B4DaW0WIwoO',
        },
        {
          alt:      'Request a chapter-wide email',
          bg:       '#eeeeee',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/a/a1/Google_docs.png',
          subtitle: 'Request a chapter-wide email',
          title:    'Bulk email',
          url:      'https://airtable.com/shrGf4B4DaW0WIwoO',
        }
      ],
      [
        {
          alt:      'Request a textbank',
          bg:       '#eeeeee',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/a/a1/Google_docs.png',
          subtitle: 'Request a textbank',
          title:    'Textbank',
          url:      'https://airtable.com/shrGf4B4DaW0WIwoO',
        },
        {
          alt:      'Comms Requests',
          bg:       '#eeeeee',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/a/a1/Google_docs.png',
          subtitle: 'Comms Requests',
          title:    'Comms Requests',
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
          bg:       '#eeeeee',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Book_icon_%28closed%29_-_Red_and_gold.svg/137px-Book_icon_%28closed%29_-_Red_and_gold.svg.png',
          subtitle: 'New Member Handbook',
          title:    'New Member Handbook',
          url:      'https://sites.google.com/view/boston-dsa-new-member-handbook/home',
        },
        {
          alt:      'Chapter Orientations',
          bg:       '#eeeeee',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Compass_icon_matte.svg/240px-Compass_icon_matte.svg.png',
          subtitle: 'Chapter Orientations',
          title:    'Orientation',
          url:      'https://actionnetwork.org/campaigns/boston-dsa-member-orientations',
        },
        {
          alt:      'Rose Buddies',
          bg:       '#eeeeee',
          icon:     'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Red_rose_02.svg/1920px-Red_rose_02.svg.png',
          subtitle: 'Rose Buddies',
          title:    'Rose Buddies',
          url:      'https://bdsa.us/RoseBuddy',
        }
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
        {
          alt:      'Blog Logo',
          bg:       '#f8b195',
          icon:     'https://i2.wp.com/bostonpewg.org/wp-content/uploads/2018/03/cropped-pewglogo1.png',
          style:    'height: 91px;',
          subtitle: 'Political Education Blog',
          title:    'Blog',
          url:      'https://bostonpewg.org/',
        }
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
