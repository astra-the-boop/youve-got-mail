async function loadMail() {
    try {
        const res = await fetch("/data/email.json");
        const email = await res.json();

        document.getElementById("letterInfo").innerHTML = `
            From: ${email.from}<br>
            To: ${email.to}<br>
            Subject: ${email.subject}<br>
            Date: ${new Date(email.date).toLocaleString()}
        `;
    } catch (err) {
        document.getElementById("letterInfo").textContent = `Error loading email: ${err.message}`;
    }
}

loadMail();
