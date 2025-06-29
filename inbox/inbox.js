const CLIENT_ID = "670454110741-kr4m3bm40ns8dbr2s10aqk4kemg4evqh.apps.googleusercontent.com";
let accessToken = null;
let tokenClient;
let n = 0;
let currentMessageId;
let isLoadingMail = false;
let isFetchingEmail = false;
let lastKeyTime = 0;
let nextPageToken = null;
let prevPageTokens = [];

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

async function fetchMessageList(query = "", pageToken ='') {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("maxResults", '100');
    if (query) url.searchParams.set("q", query);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(),{
        headers: {Authorization: `Bearer ${accessToken}` }
    });

    const data = await res.json();
    messageList = data.messages || [];
    nextPageToken = data.nextPageToken || null;
}


async function nextEmail() {
    if (document.getElementById("mailPreview").style.display !== "none") {
        document.getElementById('audio').play();
        n++;
        if (n >= messageList.length) {
            if (nextPageToken) {
                prevPageTokens.push(nextPageToken);
                await fetchMessageList("", nextPageToken);
                n = 0;
            } else {
                log("No more messages.");
                n = messageList.length - 1;
            }
        }
        listEmails(n);
    }
}


async function searchEmails() {
    const query = document.getElementById("searchInput").value;
    document.getElementById("letterInfo").innerText = "searching, nya~..";

    await fetchMessageList(query);

    if (!messageList.length) {
        document.getElementById("letterInfo").innerText = "no mail found 3: mrraw";
        document.getElementById("backArrow").style.display = "none";
        document.getElementById("nextArrow").style.display = "none";
    } else {
        n = 0;
        listEmails(n);
    }
}



async function prevEmail() {
    if (document.getElementById("mailPreview").style.display !== "none") {
        document.getElementById('audio').play();
        n--;
        if (n < 0) {
            if (prevPageTokens.length > 0) {
                const prevToken = prevPageTokens.pop();
                await fetchMessageList("", prevToken);
                n = messageList.length - 1;
            }
             else {
                log("You're at the first message.");
                n = 0;
            }
        }
        listEmails(n);
    }
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

            document.getElementById("backArrow").style.display =
                index > 0 || prevPageTokens.length > 0 ? "block" : "none";

            document.getElementById("nextArrow").style.display =
                index < messageList.length - 1 || nextPageToken ? "block" : "none";

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

async function showMail() {
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

    try {
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${currentMessageId}?format=full`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();

        const parts = getPartsRecursively(data.payload);
        const htmlPart = parts.find(p => p.mimeType === "text/html");
        const plainPart = parts.find(p => p.mimeType === "text/plain");
        let bodyData = htmlPart?.body?.data || plainPart?.body?.data || data.payload.body?.data;

        if (!bodyData) {
            log("No body content found.");
            return;
        }

        let decoded = decodeBase64Url(bodyData);

        const inlineImages = {};
        for (const part of parts) {
            if (part.body?.attachmentId && part.headers) {
                const cidHeader = part.headers.find(h => h.name.toLowerCase() === 'content-id');
                if (cidHeader) {
                    const cid = cidHeader.value.replace(/[<>]/g, '');
                    const contentType = part.mimeType;
                    const attachmentData = await fetchAttachment(currentMessageId, part.body.attachmentId);
                    inlineImages[cid] = `data:${contentType};base64,${attachmentData}`;
                }
            }
        }

        decoded = decoded.replace(/cid:([^'">]+)/g, (match, cid) => {
            return inlineImages[cid] || match;
        });

        const attachments = parts.filter(p =>
            p.body?.attachmentId && !p.headers?.some(h => h.name.toLowerCase() === 'content-id')
        );

        const attachmentHTML = await Promise.all(attachments.map(async (att) => {
            const filename = att.filename || "attachment";
            const mimeType = att.mimeType;
            const base64 = await fetchAttachment(currentMessageId, att.body.attachmentId);

            const byteCharacters = decodeBase64Url(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            const url = URL.createObjectURL(blob);

            if (mimeType.startsWith("image/")) {
                return `
            <div style="margin-top:1rem">
                <p><strong>${filename}</strong></p>
                <img src="${url}" alt="${filename}" style="max-width:100%; height:auto; border:1px solid #ccc; margin-bottom: 0.5rem;"><br>
                <a href="${url}" download="${filename}">📎 Download ${filename}</a>
            </div>`;
            } else {
                return `<p><a href="${url}" download="${filename}">📎 ${filename}</a></p>`;
            }
        }));

        document.getElementById("emailContents").innerHTML = decoded + attachmentHTML.join("");

        log("Email content loaded.");
    } catch (err) {
        log("Error fetching message content: " + err.message);
    } finally {
        isShowingEmail = false;
    }
}

async function fetchAttachment(messageId, attachmentId) {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return data.data; // already base64 encoded
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
    const fixed = data.replace(/-/g, '+').replace(/_/g, '/');
    const padded = fixed + '='.repeat((4 - fixed.length % 4) % 4);
    try {
        return atob(padded);
    } catch (e) {
        console.error("Base64 decode error:", e.message);
        return '';
    }
}



function log(msg) {
    console.log(msg);
}
