const fs = require('fs');
const https = require('https');

https.get('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDfmHOk7MljaJXAPv1hTJ75_6q631LuRyo', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('models.json', data);
  });
});