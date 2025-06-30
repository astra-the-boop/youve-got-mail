const CLIENT_ID = "670454110741-kr4m3bm40ns8dbr2s10aqk4kemg4evqh.apps.googleusercontent.com";
let accessToken = null;
let tokenClient;
let n = 0;

document.getElementById("mail").addEventListener("keydown", (e) => {
    if((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        sendMail()
    }
})

document.addEventListener('keydown', (e) => {
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
        return;
    }

    if(e.key === "/"){
        alert(`/: Shortcuts list\n\nInbox:\n<— : Previous\n—>: Next\nEnter/Return: Select\nEsc: Back\n\nCompose:\nCtrl/Cmd + Enter/Return: Send email`)
    }});

function login() {
    document.getElementById("audio2").play();
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
        callback: (tokenResponse) => {
            accessToken = tokenResponse.access_token;
            log(```Sans:
* nice.
* you're in.
[Signed in]```);
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



function sendMail() {
    document.getElementById('audio3').play();
    if (!accessToken) {
        alert("mrrp, you havent logged in yet! :3c");
        throw new Error("User not signed in.");
    }

    const email = [
        `To: ${document.getElementById('recip').value.trim()}`,
        `Subject: ${document.getElementById('subj').value.trim()}`,
        `Cc: ${document.getElementById('cc').value.trim()}`,
        `Bcc: ${document.getElementById('bcc').value.trim()}`,
        "",
        document.getElementById('mail').value
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
            if (data.id) alert("Email sent! ID: " + data.id);
            else log(```Sans:
* woops.
* guess that one didn’t make it.
[Failed to send]```);
        });



    document.getElementById("mail").value = `    /\\_/\\           ___
   = o_o =_______    \\ \\  < Thanks for using You've Got Mail! Nya~ <3 )
    __^      __(  \\.__) )
(@)<_____>__(_____)____/`;
}

function log(msg) {
    console.log(msg);
}
