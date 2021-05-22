const AWS = require('aws-sdk');
const axios = require('axios');
const Bottleneck = require('bottleneck');
const {DateTime} = require('luxon');
const jwt = require('jsonwebtoken');
const log = require('loglevel');

log.setLevel(process.env.LOG_LEVEL || 'info');

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

// See https://marketplace.zoom.us/docs/api-reference/rate-limits#rate-limits
// 30/s
const lightLimit = new Bottleneck({
  reservoir: 30,
  reservoirRefreshAmount: 30,
  reservoirRefreshInterval: 1000,
  maxConcurrent: 1,
  minTime: 100,
});

let token;

/**
 * Load Zoom secrets stored in AWS Secrets Manager.
 * These are generated via https://marketplace.zoom.us: Develop > Build JWT App
 *
 * @param {Object} options
 */
async function loadSecrets(options) {
  const secret = await secretsmanager.getSecretValue(options).promise();
  Object.assign(process.env, JSON.parse(secret.SecretString));
};

/**
 * Filtering for dates that are close to current
 *
 * @param {DateTime} meetingStart
 * @param {string} timezone
 * @return {boolean} true if the meeting is close to today
 */
function isMeetingSoon(meetingStart, timezone) {
  const local = DateTime.local().setZone(timezone);
  return (
    meetingStart > local.minus({days: 1}) &&
    meetingStart < local.plus({days: 21})
  );
}

/**
 * Fetches meeting details which have a list of occurrence.
 *
 * @param {Object} meeting
 */
async function loadStartFromOccurances(meeting) {
  try {
    const response = await axios.get(
        'https://api.zoom.us/v2/meetings/' + meeting['id'],
        {headers: {'Authorization': `Bearer ${token}`}});

    if (response.data.occurrences.length) {
      meeting['start_time'] = response.data.occurrences[0]['start_time'];
    }
  } catch (err) {
    log.error(err);
  }
}

/**
 * Adds some custom properties to the base meeting returned from the Zoom API.
 *
 * @param {Object} meeting
 * @param {string} zoomAccount
 */
async function deocrateMeeting(meeting, zoomAccount) {
  if (meeting['type'] == 8) {
    try {
      log.debug(`Meeting ${meeting['id']} on Zoom ${zoomAccount} is recurring, loading from occurances`);
      await lightLimit.schedule(() => loadStartFromOccurances(meeting));
    } catch (err) {
      log.error(err);
    }
  }

  const meetingStart = DateTime.fromISO(meeting['start_time'])
      .setZone(meeting['timezone']);

  if (!isMeetingSoon(meetingStart, meeting['timezone'])) {
    throw new RangeError('Meeting is not soon');
  }

  // Decorate additional properties for display and sorting

  const meetingEnd = meetingStart.plus({minutes: meeting['duration']});
  meeting['time_range'] = meetingStart.toLocaleString(DateTime.TIME_SIMPLE) +
    '\u2013' +
    meetingEnd.toLocaleString(DateTime.TIME_SIMPLE);
  meeting['med_date'] = meetingStart.toLocaleString(DateTime.DATE_MED);
  meeting['zoom_account'] = zoomAccount;
  meeting['short_date'] = meetingStart.toFormat('yyyyMMdd');
  meeting['millis'] = meetingStart.toMillis();
}

exports.handler = async function(event, context) {
  await loadSecrets({SecretId: AWS_SECRET});
  log.debug('Loaded secrets');

  const payload = {
    iss: process.env.ZOOM_API_KEY,
    exp: ((new Date()).getTime() + 5000),
  };
  token = jwt.sign(payload, process.env.ZOOM_API_SECRET);

  const zoomApiCalls = [];

  for (const zoomAccount in accounts) {
    log.info(`Fetching meetings for Zoom ${zoomAccount}`);
    const email = accounts[zoomAccount];
    const prom = axios.get(
        `https://api.zoom.us/v2/users/${email}/meetings?page_size=300`,
        {headers: {'Authorization': `Bearer ${token}`}})
        .then(function(response) {
          const waitOnMeetings = [];
          for (const meeting of response.data.meetings) {
            waitOnMeetings.push(
                deocrateMeeting(meeting, zoomAccount)
                    .then(function() {
                      meetingsFromZoom.push(meeting);
                    })
                    .catch(function() {
                      log.debug(`Skipping meeting "${meeting['topic']}" on Zoom ${zoomAccount} because of start time: ${meeting['start_time']}"`);
                    }),
            );
          }

          return Promise.all(waitOnMeetings).then(function(results) {
            log.info(`Fetched meetings for Zoom ${zoomAccount}`);
          });
        })
        .catch(function(error) {
          log.error(error);
        });
    zoomApiCalls.push(prom);
  }

  return Promise.all(zoomApiCalls).then(function(results) {
    log.info('All meetings fetched, assembling data.');

    // sort first, then we can just assemble the final data in order

    meetingsFromZoom.sort(function(a, b) {
      return a['millis'] - b['millis'];
    });

    for (const meeting of meetingsFromZoom) {
      const shortDate = meeting['short_date'];
      if (!(shortDate in meetingsByDate['meetings'])) {
        meetingsByDate['meetings'][shortDate] = [];
      }

      meetingsByDate['meetings'][shortDate].push(meeting);
      meetingsByDate['dates'].push(shortDate);
    }

    meetingsByDate['dates'] = Array.from(new Set(meetingsByDate['dates']));
    meetingsByDate['dates'].sort();

    const params = {
      Bucket: AWS_BUCKET,
      Key: 'zoom_meetings.json', // File name you want to save as in S3
      Body: JSON.stringify(meetingsByDate),
    };

    log.debug(JSON.stringify(meetingsByDate, null, 2));

    return s3.upload(params, function(err, data) {
        if (err) {
            throw err;
        }
        log.info('zoom_meetings.json uploaded to S3');
    }).promise();
  });
};
