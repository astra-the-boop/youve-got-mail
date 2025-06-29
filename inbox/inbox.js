const CLIENT_ID = "670454110741-kr4m3bm40ns8dbr2s10aqk4kemg4evqh.apps.googleusercontent.com";
let accessToken = null;
let tokenClient;
let n = 0;
let currentMessageId;
let isLoadingMail = false;
let isFetchingEmail = false;
let lastKeyTime = 0;
let originalMessageList = [];


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

document.addEventListener('keydown', (e) => {
    const now = Date.now();
    if (now - lastKeyTime < 150) return;
    lastKeyTime = now;

    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
        return;
    }

    if(e.key === "ArrowLeft"){
        prevEmail();
    }
    if(e.key === "ArrowRight"){
        nextEmail();
    }
    if (e.key === "Escape") {
        showPreview();
        isLoadingMail = false;
    }

    if(e.key === "Enter"){
        showFullEmail();
        showMail();
    }

    if(e.key === "/"){
        alert(`/: Shortcuts list\n\nInbox:\n<— : Previous\n—>: Next\nEnter/Return: Select\nEsc: Back\n\nCompose:\nCtrl/Cmd + Enter/Return: Send email`)
    }
})

async function fetchMessageList() {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    messageList = data.messages || [];
    originalMessageList = [...messageList];
}


function nextEmail() {
    if(document.getElementById("mailPreview").style.display !== "none"){
    document.getElementById('audio').play();
    n++;
    listEmails(n);}


}

async function searchEmails() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    messageList = [...originalMessageList];
    const filtered = [];

    for (const msg of messageList) {
        try {
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const email = await res.json();

            if (!email.payload || !email.payload.headers) {
                console.warn("Invalid email data for ID:", msg.id);
                continue;
            }

            const headers = email.payload.headers;
            const subject = headers.find(h => h.name === "Subject")?.value?.toLowerCase() || "";
            const from = headers.find(h => h.name === "From")?.value?.toLowerCase() || "";

            if (subject.includes(query) || from.includes(query)) {
                filtered.push(msg);
            }

        } catch (err) {
            console.error("Failed to fetch email:", err);
        }
    }

    if (filtered.length === 0) {
        document.getElementById("letterInfo").innerHTML = "No results found.";
        document.getElementById("backArrow").style.display = "none";
        document.getElementById("nextArrow").style.display = "none";
        return;
    }

    messageList = filtered;
    n = 0;
    listEmails(n);
}


function prevEmail() {
    if(document.getElementById("mailPreview").style.display !== "none"){
    document.getElementById('audio').play();
    if (n > 0) {
        n--;
        listEmails(n);
    }}
}

function listEmails(index) {
    if (isFetchingEmail) return;
    isFetchingEmail = true;

    if (!accessToken) return log("Not signed in");
    if (!messageList.length) return log("No messages loaded.");
    if (index >= messageList.length) {
        log("No more messages.");
        isFetchingEmail = false;
        return;
    }

    const msg = messageList[index];
    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
        .then(res => res.json())
        .then(email => {
            currentMessageId = msg.id;

            const headers = email.payload.headers || [];
            const from = headers.find(h => h.name === "From")?.value || "Unknown Sender";
            const subject = headers.find(h => h.name === "Subject")?.value || "(No Subject)";

            document.getElementById("letterInfo").innerHTML = `From: ${from}<br>Subject: ${subject}`;

            document.getElementById("backArrow").style.display = (index > 0) ? "block" : "none";
            document.getElementById("nextArrow").style.display = (index < messageList.length - 1) ? "block" : "none";
        })
        .catch(err => log("Error loading message: " + err.message))
        .finally(() => {
            isFetchingEmail = false;
        });
}

function showPreview() {
    document.getElementById("mailPreview").style.display = "block";
    document.getElementById("emailContentsContainer").style.display = "none";
}

function showFullEmail() {
    document.getElementById("mailPreview").style.display = "none";
    document.getElementById("emailContentsContainer").style.display = "block";
}


let isShowingEmail = false;

function showMail() {
    if (isShowingEmail) return;
    isShowingEmail = true;

    document.getElementById('audio').play();
    document.getElementById("mailPreview").style.display = "none";
    document.getElementById("emailContentsContainer").style.display = "block";

    if (!accessToken || !currentMessageId) {
        log("No message selected");
        isShowingEmail = false;
        return;
    }

    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${currentMessageId}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
        .then(res => res.json())
        .then(data => {
            const parts = getPartsRecursively(data.payload);
            const htmlPart = parts.find(p => p.mimeType === "text/html");
            const plainPart = parts.find(p => p.mimeType === "text/plain");
            const bodyData = htmlPart?.body?.data || plainPart?.body?.data || data.payload.body?.data;

            if (!bodyData) {
                log("No body content found.");
                return;
            }

            const decoded = decodeBase64Url(bodyData);
            document.getElementById("emailContents").innerHTML = decoded;
            log("Email content loaded.");
        })
        .catch(err => log("Error fetching message content: " + err.message))
        .finally(() => {
            isShowingEmail = false;
        });
}


function getPartsRecursively(data) {
    const all = [];
    (function recurse(p){
        if (p.parts) p.parts.forEach(recurse);
        else all.push(p);
    })(data);
    console.log(JSON.stringify(data.payload, null, 2));
    return all;
}

function decodeBase64Url(data) {
    const fixed = data.replace(/-/g, '+').replace(/_/g,'/');
    const padding = '='.repeat((fixed.length - 4)%4);
    try{
        return atob(fixed+padding);
    }catch(e){
        console.error('failed to decode',e.message);
        return 'error decoding body'
    }
}


function log(msg) {
    console.log(msg);
}
