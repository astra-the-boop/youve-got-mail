require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ImapFlow } = require("imapflow");
const path = require("path");

const app = express();
app.use(cors());

app.use(express.static(path.join(__dirname, "../inbox")));

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
        const range = `${seq}:${seq}`;
        let email = {};

        for await (let msg of client.fetch(range, { envelope: true })) {
            email = {
                from: msg.envelope.from?.map(f => `${f.name || ''} <${f.address}>`).join(", ") || "(unknown)",
                to: msg.envelope.to?.map(f => `${f.name || ''} <${f.address}>`).join(", ") || "(unknown)",
                subject: msg.envelope.subject || "(no subject)",
                date: msg.envelope.date
            };
        }

        console.log("📨 Sending email:", email);
        await client.logout(); // ✅ do this before responding
        res.json(email);       // ✅ respond once, after logout
    } catch (err) {
        console.error("❌ IMAP fetch failed:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(5000, () => {
    console.log("📡 Server running at http://localhost:5000");
});
