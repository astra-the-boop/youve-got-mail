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
    document.getElementById('audio2').play();
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
                log(```Sans:
* this is it.
* the very beginning.
* no goin’ back, kid.
[You're at the first email]```);
                n = 0;
            }
        }
        listEmails(n);
    }
}


function listEmails(index) {
    if (isFetchingEmail) return;
    isFetchingEmail = true;

    if (!accessToken) return log(```Sans:
* door’s locked.
* try signin’ in first, pal.
[Not signed in]```);
    if (!messageList.length) return log(```Sans:
* nothing to see here.
* yet.
[No emails loaded]```);
    if (index >= messageList.length) {
        log(```Sans:
* that’s all, folks.
* bone dry.
[No more messages]```);
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
        .catch(err => log(```Sans:
* something’s busted.
* not my fault this time.
[Error: ${err.message}```))
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

function buildEml(message) {
    const headers = message.payload.headers || {};
    const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";

    const from = get("From");
    const to = get("To");
    const cc = get("Cc");
    const subject = get("Subject");
    const date = get("Date");
    const mimeVer = "1.0";
    const contentType = "text/plain; charset=UTF-8";

    const parts = getPartsRecursively(message.payload);
    const plain = parts.find(p => p.mimeType === "text/plain");
    const bodyData = plain?.body?.data || message.payload.body?.data;
    const body = decodeBase64Url(bodyData || "");

    return [
        `From: ${from}`,
        `To: ${to}`,
        cc ? `Cc: ${cc}` : "",
        `Subject: ${subject}`,
        `Date: ${date}`,
        `MIME-Version: ${mimeVer}`,
        `Content-Type: ${contentType}`,
        ``,
        body
    ].join("\r\n");
}


async function showMail() {
    if (isShowingEmail) return;
    isShowingEmail = true;

    document.getElementById('audio1').play();
    document.getElementById("mailPreview").style.display = "none";
    document.getElementById("emailContentsContainer").style.display = "block";

    //aaaaaaaAAAAAAAAA krill me

    if (!accessToken || !currentMessageId) {
        log(```Sans:
* pick one.
* i ain’t a mind reader. (…usually.)
[No messages selected]```);
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
            log(```Sans:
* found the skeleton.
* no guts, though.
[No body content found]```);
            return;
        }
        const inlineImages = {};

        let decoded = decodeBase64Url(bodyData);
        for (const part of parts) {
            if (part.body?.attachmentId && part.headers) {
                const cidHeader = part.headers.find(h => h.name.toLowerCase() === 'content-id');
                if (cidHeader) {
                    const cid = cidHeader.value.replace(/[<>]/g, '');
                    const mimeType = part.mimeType;
                    const filename = part.filename || `${cid}.${mimeType.split('/')[1]}`;
                    const base64 = await fetchAttachment(currentMessageId, part.body.attachmentId);

                    const byteCharacters = decodeBase64Url(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: mimeType });
                    const url = URL.createObjectURL(blob);

                    inlineImages[cid] = `<a href="${url}" download="${filename}">📸 ${filename}</a>`;


                }
            }
        }

// Replace <img src="cid:..."> tags with download links
        decoded = decoded.replace(/<img[^>]+src=["']cid:([^"']+)["'][^>]*>/gi, (_, cid) => {
            return inlineImages[cid] || '[image]';
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

            return `<p><a href="${url}" download="${filename}">📎 Download ${filename}</a></p>`;

        }));

        document.getElementById("emailContents").innerHTML = decoded + attachmentHTML.join("");
        const emlContent = buildEml(data);
        const emlBlob = new Blob([emlContent], { type: "message/rfc822" });
        const emlUrl = URL.createObjectURL(emlBlob);
        const emlLink = `<p><a href="${emlUrl}" download="message.eml"><button>Save as .eml</button></a></p>`;
        document.getElementById("emailContents").innerHTML += emlLink;

        log(```Sans:
* sweet.
* got it all in one piece.
[Email content loaded]```);
    } catch (err) {
        log(```Sans:
* welp.
* that email’s toast.
[Error fetching email content]```);
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
