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
  res.on('end', () => {
    const course = JSON.parse(data).data[0];
    const secOptions = {
      hostname: 'api.utdnebula.com',
      path: `/section?course_reference=${course._id}`,
      headers: {
        'x-api-key': 'AIzaSyB2zQIwK0gowd-Pkum4SHVzRVK7-PrwlUY',
        'Accept': 'application/json'
      }
    };
    https.get(secOptions, (secRes) => {
      let secData = '';
      secRes.on('data', chunk => secData += chunk);
      secRes.on('end', () => {
        const sections = JSON.parse(secData).data || [];
        console.log("Total sections:", sections.length);
        if (sections.length > 0) {
           console.log("Sample section session info:", JSON.stringify(sections.slice(0, 5).map(s => s.academic_session), null, 2));
           console.log("Sample instructors:", JSON.stringify(sections.slice(0, 5).map(s => s.instructors || s.professors), null, 2));
        }
      });
    });
  });
}).on('error', err => console.error(err));
