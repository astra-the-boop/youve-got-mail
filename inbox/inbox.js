const express = require("express");
const path = require("path");
const { ImapFlow } = require("imapflow");
require("dotenv").config();

const app = express();

// ✅ Serve static files from /inbox
app.use("/inbox", express.static(path.join(__dirname, "../inbox")));

// 🏠 Optional homepage
app.get("/", (req, res) => {
    res.send(`<h1>You've Got Mail</h1><a href="/inbox/index.html">Open Inbox</a>`);
});

// ✉️ Email fetch API
app.get("/api/fetch-email", async (req, res) => {
    const n = parseInt(req.query.n) || 1;

    const client = new ImapFlow({
        host: "imap.mail.me.com",
        port: 993,
        secure: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });

    try {
        await client.connect();
        const mailbox = await client.mailboxOpen("INBOX");
        const total = mailbox.exists;

        if (n > total) {
            return res.status(400).json({ error: `Only ${total} emails in inbox.` });
        }

        const seq = total - n + 1;
        let email = {};
        for await (let msg of client.fetch(`${seq}:${seq}`, { envelope: true })) {
            email = {
                from: msg.envelope.from?.map(f => `${f.name || ''} <${f.address}>`).join(", ") || "(unknown)",
                to: msg.envelope.to?.map(f => `${f.name || ''} <${f.address}>`).join(", ") || "(unknown)",
                subject: msg.envelope.subject || "(no subject)",
                date: msg.envelope.date
            };
        }

        await client.logout();
        res.json(email);
    } catch (err) {
        console.error("❌ IMAP error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(5000, () => {
    console.log("📡 Server running at http://localhost:5000");
});
