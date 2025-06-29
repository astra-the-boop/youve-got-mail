let currentIndex = 1;

async function loadMail() {
    try {
        const res = await fetch(`/api/fetch-email?n=${currentIndex}`);
        const text = await res.text();
        console.log("📦 Raw response from server:", text);

        const data = JSON.parse(text);
        console.log("✅ Parsed JSON:", data);

        if (data.error) {
            document.getElementById("letterInfo").textContent = `Error: ${data.error}`;
            return;
        }

        document.getElementById("letterInfo").innerHTML = `
            From: ${data.from}<br>
            To: ${data.to}<br>
            Subject: ${data.subject}<br>
            Date: ${new Date(data.date).toLocaleString()}
        `;
    } catch (err) {
        console.error("❌ JSON parse failed:", err);
        document.getElementById("letterInfo").textContent = `Error: ${err.message}`;
    }
}

loadMail();
