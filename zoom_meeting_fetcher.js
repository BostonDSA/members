const AWS = require('aws-sdk');
const axios = require('axios');
const { DateTime } = require("luxon");
const jwt = require('jsonwebtoken');

const AWS_SECRET = process.env.AWS_SECRET;
const AWS_BUCKET = process.env.AWS_BUCKET;

const s3 = new AWS.S3();
const secretsmanager = new AWS.SecretsManager();

const accounts = {
    "1": "info@bostondsa.org",
    "2": "treasurer@bostondsa.org",
    "3": "zoom@bostondsa.org"
}

// Used for collecting the raw meetings
const meetings_from_zoom = [];

// Storing formatted meetings
const meetings_by_date = {
    'meetings': {},
    'dates': []
};

// Zoom secrets stored in secrets manager
// These are generated via https://marketplace.zoom.us: Develop > Build JWT App
const load_secrets = async (options) => {
    const secret = await secretsmanager.getSecretValue(options).promise();
    Object.assign(process.env, JSON.parse(secret.SecretString));
  };

exports.handler = (event, context) => {

    load_secrets({SecretId: AWS_SECRET}).then(() => {

        const payload = {
            iss: process.env.ZOOM_API_KEY,
            exp: ((new Date()).getTime() + 5000)
        };
        const token = jwt.sign(payload, process.env.ZOOM_API_SECRET);

        let zoom_api_calls = [];

        for (const prop in accounts) {
            const email = accounts[prop];
            let prom = axios.get("https://api.zoom.us/v2/users/" + email + "/meetings?page_size=300", {headers: {"Authorization" : `Bearer ${token}`}})
                .then(function(response) {

                    response.data.meetings.forEach(element => {

                        const meeting_start_dt = DateTime.fromISO(element['start_time']).setZone(element['timezone']);
                        const local = DateTime.local().setZone(element['timezone']);

                        if (meeting_start_dt < local.minus({days: 1}) ||
                        meeting_start_dt > local.plus({days: 20})
                        ) {
                            return;
                        }

                        // Decorate additional properties for display and sorting

                        const meeting_end_dt = meeting_start_dt.plus({ minutes: element['duration'] });
                        element['time_range'] = meeting_start_dt.toLocaleString(DateTime.TIME_SIMPLE) + "\u2013" +
                            meeting_end_dt.toLocaleString(DateTime.TIME_SIMPLE);
                        element['med_date'] = meeting_start_dt.toLocaleString(DateTime.DATE_MED);
                        element['zoom_account'] = prop;
                        element['short_date'] = meeting_start_dt.toFormat("yyyyMMdd");
                        element['millis'] = meeting_start_dt.toMillis();

                        meetings_from_zoom.push(element)
                    });

                    console.log('Fetched meetings for zoom account: ' + prop);
                })
                .catch(function(error) {
                    console.error(error)
                });
            zoom_api_calls.push(prom);
        }

        Promise.all(zoom_api_calls).then(function (results) {
            console.log('All meetings fetched, assembling data.');

            // sort first, then we can just assemble the final data in order

            meetings_from_zoom.sort(function(a, b) {
                return a['millis'] - b['millis'];
            });

            meetings_from_zoom.forEach(element => {
                let short_date = element['short_date'];
                if (!(short_date in meetings_by_date['meetings'])) {
                    meetings_by_date['meetings'][short_date] = [];
                }

                meetings_by_date['meetings'][short_date].push(element);
                meetings_by_date['dates'].push(short_date);
            });

            meetings_by_date['dates'] = Array.from(new Set(meetings_by_date['dates']));
            meetings_by_date['dates'].sort();

            const params = {
                Bucket: AWS_BUCKET,
                Key: 'zoom_meetings.json', // File name you want to save as in S3
                Body: JSON.stringify(meetings_by_date)
            };

            s3.upload(params, function(err, data) {
                if (err) {
                    throw err;
                }
                console.log('zoom_meetings.json uploaded to S3');
            });
        });
    });
};
