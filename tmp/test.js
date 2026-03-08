const prompt = `Convert this university schedule text into a raw JSON array of class objects. DO NOT include markdown, no backticks, no explanations. JUST the JSON array.
Format: [{"time":"1:00pm-2:15pm","course":"CS 3341","title":"Probability","location":"ECSS 2.412","type":"class"}]

Text:
Monday

8:30 AM – 9:45 AM — CS 3345-005
Room: ECSW 1.355
Professor: Omar Hamdy`;

fetch(`https://text.pollinations.ai/`, {
  method: "POST",
  body: prompt
})
.then(res => res.text())
.then(text => console.log(text))
.catch(err => console.error(err));
