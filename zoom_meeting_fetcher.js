const AWS = require('aws-sdk');
const axios = require('axios');
const {DateTime} = require('luxon');
const jwt = require('jsonwebtoken');

const AWS_SECRET = process.env.AWS_SECRET;
const AWS_BUCKET = process.env.AWS_BUCKET;

const s3 = new AWS.S3();
const secretsmanager = new AWS.SecretsManager();

const accounts = {
  '1': 'info@bostondsa.org',
  '2': 'treasurer@bostondsa.org',
  '3': 'zoom@bostondsa.org',
};

// Used for collecting the raw meetings
const meetingsFromZoom = [];

// Storing formatted meetings
const meetingsByDate = {
  'meetings': {},
  'dates': [],
};

let token;

/**
 * Load Zoom secrets stored in AWS Secrets Manager.
 * These are generated via https://marketplace.zoom.us: Develop > Build JWT App
 *
 * @param {*} options
 */
async function loadSecrets(options) {
  const secret = await secretsmanager.getSecretValue(options).promise();
  Object.assign(process.env, JSON.parse(secret.SecretString));
};

/**
 * Filtering for dates that are close to current
 *
 * @param {*} meeting
 * @return {boolean} true if the meeting is close to today
 */
function isMeetingSoon(meeting) {
  const local = DateTime.local().setZone(meeting['timezone']);
  return (
    meeting > local.minus({days: 1}) ||
    meeting < local.plus({days: 21})
  );
}

exports.handler = (event, context) => {
  loadSecrets({SecretId: AWS_SECRET}).then(() => {
    const payload = {
      iss: process.env.ZOOM_API_KEY,
      exp: ((new Date()).getTime() + 5000),
    };
    token = jwt.sign(payload, process.env.ZOOM_API_SECRET);

    const zoomApiCalls = [];

    for (const prop in accounts) {
      const email = accounts[prop];
      const prom = axios.get(
          'https://api.zoom.us/v2/users/' + email + '/meetings?page_size=300',
          {headers: {'Authorization': `Bearer ${token}`}})
          .then(function(response) {
            console.log(response.data.meetings);

            response.data.meetings.forEach((meeting) => {
              const meetingStart = DateTime.fromISO(meeting['start_time'])
                  .setZone(meeting['timezone']);

              if (!isMeetingSoon(meetingStart)) {
                return;
              }

              // Decorate additional properties for display and sorting

              const meetingEnd = meetingStart.plus({minutes: meeting['duration']});
              meeting['time_range'] = meetingStart.toLocaleString(DateTime.TIME_SIMPLE) +
                '\u2013' +
                meetingEnd.toLocaleString(DateTime.TIME_SIMPLE);
              meeting['med_date'] = meetingStart.toLocaleString(DateTime.DATE_MED);
              meeting['zoom_account'] = prop;
              meeting['short_date'] = meetingStart.toFormat('yyyyMMdd');
              meeting['millis'] = meetingStart.toMillis();

              meetingsFromZoom.push(meeting);
            });

            console.log('Fetched meetings for zoom account: ' + prop);
          })
          .catch(function(error) {
            console.error(error);
          });
      zoomApiCalls.push(prom);
    }

    Promise.all(zoomApiCalls).then(function(results) {
      console.log('All meetings fetched, assembling data.');

      // sort first, then we can just assemble the final data in order

      meetingsFromZoom.sort(function(a, b) {
        return a['millis'] - b['millis'];
      });

      meetingsFromZoom.forEach((meeting) => {
        const shortDate = meeting['short_date'];
        if (!(shortDate in meetingsByDate['meetings'])) {
          meetingsByDate['meetings'][shortDate] = [];
        }

        meetingsByDate['meetings'][shortDate].push(meeting);
        meetingsByDate['dates'].push(shortDate);
      });

      meetingsByDate['dates'] = Array.from(new Set(meetingsByDate['dates']));
      meetingsByDate['dates'].sort();

      const params = {
        Bucket: AWS_BUCKET,
        Key: 'zoom_meetings.json', // File name you want to save as in S3
        Body: JSON.stringify(meetingsByDate),
      };

      s3.upload(params, function(err, data) {
          if (err) {
              throw err;
          }
          console.log('zoom_meetings.json uploaded to S3');
      });

      console.log(meetingsByDate);
    });
  });
};
