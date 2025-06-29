const CLIENT_ID = "670454110741-kr4m3bm40ns8dbr2s10aqk4kemg4evqh.apps.googleusercontent.com";
let accessToken = null;
let tokenClient;
let n = 0;
let currentMessageId;

function login() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
        callback: (tokenResponse) => {
            accessToken = tokenResponse.access_token;
            log("Signed in!");
            fetchMessageList().then(() => listEmails(n));
        }
    });

    tokenClient.requestAccessToken();
}

async function fetchMessageList() {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    messageList = data.messages || [];
}


function nextEmail() {
    n++;
    listEmails(n);
}

function prevEmail() {
    if (n > 0) {
        n--;
        listEmails(n);
    }
}

function listEmails(index) {
    if (!accessToken) return log("⚠️ Not signed in");
    if (!messageList.length) return log("📭 No messages loaded.");
    if (index >= messageList.length) {
        log("📭 No more messages.");
        return;
    }

    const msg = messageList[index];
    currentMessageId = msg.id;
    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
        .then(res => res.json())
        .then(email => {
            const headers = email.payload.headers;
            const from = headers.find(h => h.name === "From")?.value;
            const subject = headers.find(h => h.name === "Subject")?.value;
            document.getElementById("letterInfo").innerHTML = `From: ${from}<br>Subject: ${subject}`;

            // Show/hide arrows
            document.getElementById("backArrow").style.display = (index > 0) ? "block" : "none";
            document.getElementById("nextArrow").style.display = (index < messageList.length - 1) ? "block" : "none";
        })
        .catch(err => log("❌ Error loading message: " + err.message));
}

function showMail(){
    document.getElementById("mailPreview").style.display = "none";
    if (!accessToken || !currentMessageId) return log("⚠️ No message selected");

    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${currentMessageId}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
        .then(res => res.json())
        .then(data => {
            // Gmail messages have a payload structure — look for plain text or HTML
            const parts = data.payload.parts;
            let bodyData = "";

            if (parts && parts.length) {
                const plainPart = parts.find(part => part.mimeType === "text/plain");
                const htmlPart = parts.find(part => part.mimeType === "text/html");
                const chosenPart = plainPart || htmlPart || parts[0];
                bodyData = chosenPart.body.data;
            } else {
                bodyData = data.payload.body.data;
            }

            if (!bodyData) return log("⚠️ No body content found");

            // Gmail uses base64url encoding
            const decoded = atob(bodyData.replace(/-/g, '+').replace(/_/g, '/'));
            console.log("📩 Message Content:\n", decoded);
        })
        .catch(err => log("❌ Error fetching message content: " + err.message));
}

function sendMail() {
    if (!accessToken) return log("⚠️ Not signed in");

    const email = [
        "To: your.email@example.com",
        "Subject: Hello from JS!",
        "",
        "This was sent using the Gmail API + frontend only!"
    ].join("\r\n");

    const encoded = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: encoded })
    })
        .then(res => res.json())
        .then(data => {
            if (data.id) log("✅ Email sent! ID: " + data.id);
            else log("❌ Failed to send");
        });
}

function log(msg) {
    console.log(msg); // ✅ useful for debugging
}
