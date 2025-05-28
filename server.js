const path = require('path')
const express = require('express')
const axios = require('axios')
const app = express()

// Built-in API Key (replace with your actual key)
const apiKey = "sk_live_5h6PyOOs7MizrK0txBwfr1kdgmnVZwi2JRlCb8R9GBc" 

let computer = null;
let sessionTimer = null;
let sessionActive = false;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'))
})

app.get('/computer', async (req, res) => {
  if (computer) {
    res.send({...computer, sessionActive})
    return
  }
  const resp = await axios.post('https://engine.hyperbeam.com/v0/vm', {}, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })

  computer = resp.data
  res.send({...computer, sessionActive: false})
})

app.get('/end-session', async (req, res) => {
  if (computer && sessionActive) {
    try {
      await axios.delete(`https://engine.hyperbeam.com/v0/vm/${computer.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      computer = null;
      sessionActive = false;
      if (sessionTimer) clearTimeout(sessionTimer);
      res.send({ success: true })
    } catch (error) {
      res.status(500).send({ error: "Failed to end session" })
    }
  } else {
    res.send({ success: false, message: "No active session" })
  }
})

app.listen(8080, () => {
  console.log('Server start at http://localhost:8080')
})
