import https from 'https';

const API_KEY = "AIzaSyB2zQIwK0gowd-Pkum4SHVzRVK7-PrwlUY";
const url = "https://api.utdnebula.com/professor?first_name=Jennifer&last_name=Johnson";

const options = {
  headers: {
    'x-api-key': API_KEY,
    'Accept': 'application/json'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    try {
      console.log("BODY:", JSON.parse(data));
    } catch(e) {
      console.log("BODY:", data);
    }
  });
}).on('error', err => {
  console.error(err);
});
