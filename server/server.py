import imaplib
import email
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL = os.getenv("EMAIL")
PASSWORD = os.getenv("PASSWORD")
N = 1  # Fetch the Nth most recent email

def fetch_email():
    try:
        print(f"📡 Connecting to iCloud as {EMAIL}")
        mail = imaplib.IMAP4_SSL("imap.mail.me.com")
        mail.login(EMAIL, PASSWORD)
        print("✅ Logged in")

        mail.select("inbox")
        result, data = mail.search(None, "ALL")

        print(f"📦 Raw search result: {result}, data: {data}")

        if result != "OK" or not data or not data[0]:
            print("❌ Failed to search mailbox or inbox is empty.")
            return

        # Decode and get the Nth most recent email ID
        mail_ids = data[0].decode().split()
        total = len(mail_ids)

        if N > total:
            print(f"❌ Only {total} emails in inbox.")
            return

        target_id = mail_ids[-N]
        print(f"🎯 Fetching email ID: {target_id}")
        result, msg_data = mail.fetch(target_id, "(RFC822)")

        print(f"📥 Fetch result: {result}, msg_data: {msg_data}")

        if result != "OK":
            print("❌ Failed to fetch the email.")
            return

        # Find the actual message payload in msg_data
        raw_email = None
        for part in msg_data:
            if isinstance(part, tuple) and len(part) == 2:
                raw_email = part[1]
                break

        if raw_email is None:
            print("❌ Could not find valid email content in msg_data.")
            return

        msg = email.message_from_bytes(raw_email)

        from_ = msg.get("From", "(unknown)")
        to = msg.get("To", "(unknown)")
        subject = msg.get("Subject", "(no subject)")
        date = msg.get("Date", "(unknown)")

        print("\n📨 Email Info:")
        print(f"📥 From: {from_}")
        print(f"📤 To: {to}")
        print(f"📝 Subject: {subject}")
        print(f"📅 Date: {date}")

        # Print the plain text body (if available)
        body = "(no plain text body found)"
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain" and not part.get("Content-Disposition"):
                    body = part.get_payload(decode=True).decode(errors="ignore")
                    break
        else:
            body = msg.get_payload(decode=True).decode(errors="ignore")

        print(f"\n📄 Body:\n{body.strip()}")

        mail.logout()

    except Exception as e:
        print("❌ Error:", repr(e))

if __name__ == "__main__":
    fetch_email()
