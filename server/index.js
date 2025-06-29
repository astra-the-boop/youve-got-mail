async function loadMail() {
    try {
        const res = await fetch("/data/email.json");
        const email = await res.json();

        document.getElementById("letterInfo").innerHTML = `
            From: ${email.from}<br>
            To: ${email.to}<br>
            Subject: ${email.subject}<br>
            Date: ${email.date}
        `;
    } catch (err) {
        document.getElementById("letterInfo").textContent = `Error: ${err.message}`;
    }
}

loadMail();