const projectId = "tyoyjorzqtlrwfsooetp";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3lqb3J6cXRscndmc29vZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTk3MTUsImV4cCI6MjA4ODQ5NTcxNX0.DVUZWui9t43cejmY49Q3t6das0gC0pWuh_1v735JKJE";

fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a9f9c092/extract-schedule`, {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "Authorization": `Bearer ${publicAnonKey}`
  },
  body: JSON.stringify({ text: "Monday 8:30 AM CS 3345 Room ECSW" })
})
.then(res => res.json())
.then(data => console.log("Response:", data))
.catch(err => console.error("Error:", err));
