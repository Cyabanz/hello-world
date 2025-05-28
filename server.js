// ---- BACKEND: Node.js + Express ----
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const HYPERBEAM_API_KEY = "sk_live_5h6PyOOs7MizrK0txBwfr1kdgmnVZwi2JRlCb8R9GBc"; // <-- Replace this
const HYPERBEAM_API_URL = "https://engine.hyperbeam.com/v0/vm";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let session = null;
let sessionTimer = null;
let sessionHistory = []; // Store session history objects

// Start a new VM session
app.post('/start', async (req, res) => {
    if (session) {
        return res.status(400).json({ error: "Session already running" });
    }
    try {
        const hbRes = await fetch(HYPERBEAM_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HYPERBEAM_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        });
        const data = await hbRes.json();
        session = {
            id: data.id,
            embed_url: data.embed_url,
            expires_at: Date.now() + 5 * 60 * 1000 // 5 minutes from now
        };
        // Log to history
        sessionHistory.push({ startedAt: Date.now(), endedAt: null });

        // Auto-kill session after 5 minutes
        sessionTimer = setTimeout(async () => {
            await killSession();
        }, 5 * 60 * 1000);

        res.json({ url: session.embed_url });
    } catch (err) {
        res.status(500).json({ error: "Failed to start session", details: err.message });
    }
});

// Kill the VM session early
app.post('/kill', async (req, res) => {
    if (!session) return res.status(400).json({ error: "No active session" });
    await killSession();
    res.json({ success: true });
});

async function killSession() {
    if (!session) return;
    try {
        await fetch(`${HYPERBEAM_API_URL}/${session.id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${HYPERBEAM_API_KEY}`
            }
        });
    } catch (err) {
        // Ignore errors
    }
    // Update history
    if (sessionHistory.length > 0 && !sessionHistory[sessionHistory.length-1].endedAt) {
        sessionHistory[sessionHistory.length-1].endedAt = Date.now();
    }
    session = null;
    if (sessionTimer) clearTimeout(sessionTimer);
    sessionTimer = null;
}

// Get session status
app.get('/status', (req, res) => {
    if (!session) return res.json({ active: false });
    const timeLeft = Math.max(0, session.expires_at - Date.now());
    res.json({ active: true, url: session.embed_url, timeLeft });
});

// Get session history
app.get('/history', (req, res) => {
    res.json({ count: sessionHistory.length, history: sessionHistory });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
