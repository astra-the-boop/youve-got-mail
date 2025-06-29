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

document.addEventListener('keydown', (e) => {
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
        return;
    }

    if(e.key === "ArrowLeft"){
        prevEmail();
    }
    if(e.key === "ArrowRight"){
        nextEmail();
    }
    if(e.key === "Escape"){
        document.getElementById('emailContentsContainer').style.display='none';
        document.getElementById('mailPreview').style.display = 'block';
    }
    if(e.key === "Enter"){
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
}


function nextEmail() {
    document.getElementById('audio').play();
    n++;
    listEmails(n);
}

function prevEmail() {
    document.getElementById('audio').play();
    if (n > 0) {
        n--;
        listEmails(n);
    }
}

function listEmails(index) {
    if (!accessToken) return log("Not signed in");
    if (!messageList.length) return log("No messages loaded.");
    if (index >= messageList.length) {
        log("No more messages.");
        return;
    }

    const msg = messageList[index];
    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
        .then(res => res.json())
        .then(email => {
            currentMessageId = msg.id;

            const headers = email.payload.headers;
            const from = headers.find(h => h.name === "From")?.value;
            const subject = headers.find(h => h.name === "Subject")?.value;
            document.getElementById("letterInfo").innerHTML = `From: ${from}<br>Subject: ${subject}`;

            document.getElementById("backArrow").style.display = (index > 0) ? "block" : "none";
            document.getElementById("nextArrow").style.display = (index < messageList.length - 1) ? "block" : "none";
        })
        .catch(err => log("Error loading message: " + err.message));

}

function showMail() {
    document.getElementById('audio').play();
    document.getElementById("mailPreview").style.display = "none";
    document.getElementById("emailContentsContainer").style.display = "block";

    if (!accessToken || !currentMessageId) return log("No message selected");

    fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${currentMessageId}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
        .then(res => res.json())
        .then(data => {
            const parts = getPartsRecursively(data.payload);
            const htmlPart = parts.find(p => p.mimeType === "text/html");
            const plainPart = parts.find(p => p.mimeType === "text/plain");

            const bodyData =
                htmlPart?.body?.data || plainPart?.body?.data || data.payload.body?.data;

            if (!bodyData) return log("No body content found.");

            console.log("bodyData:", bodyData);

            const decoded = decodeBase64Url(bodyData);

            document.getElementById("emailContents").innerHTML = decoded;

            log("Email content loaded.");
        })
        .catch(err => log("Error fetching message content: " + err.message));
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
