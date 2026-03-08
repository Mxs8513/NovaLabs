const https = require('https');
const options = {
  hostname: 'api.utdnebula.com',
  path: '/course?subject_prefix=CS&course_number=3345',
  headers: {
    'x-api-key': 'AIzaSyB2zQIwK0gowd-Pkum4SHVzRVK7-PrwlUY',
    'Accept': 'application/json'
  }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(data).data[0], null, 2)));
}).on('error', err => console.error(err));
