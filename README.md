# You've Got Mail!
A playful, 90s-kids-software themed Gmail client!

### please don't overuse the github.io page :( it's using my api client id and my broke ass is not paying for higher quotas :sob: :pf:
### the github.io page is only for demo purposes

---

### Supports:
- Reading and writing, and sending emails
- Multiple recipients (CC, BCC)
- Keyboard shortcuts!
- Email searching for sender and subject
- Attachments (bc i can't fix my attachment issues so this is the next best thing i can do)
- Nya~

---

### Host it yourself
1. **Clone the repo!**
```bash
git clone https://github.com/your-username/youve-got-mail.git
```

2. **Set up your own Gmail Oath Client (please don't freeload off of me, i'm broke)**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project
- Enable Gmail API
- Under "OAuth 2.0 Client IDs", generate a new client
  - Type: Web application
  - Authorized origin: whatever IP or domain you're running it from, if you're just using it locally, http://localhost is fine
  - Redirect URI: Not needed for token-based auth

3. **Edit `inbox/inbox.js` and `compose/compose.js`** _(please don't freeload off of me, once again i'm broke)_
- replace `CLIENT_ID` with yours
```js
const CLIENT_ID = "your-client-id-here";
```

4. host the app

---

### Credits
me. myself. i.
UI? Me.
Icons? Also me.
OAuth bugs? Also me, crying.
I’m tired. Save me.

cc. astra.the.boop@icloud.com if you need anythiing... or just dm me on my socials you prolly have them, just click on my gh profile ffs scjadka,s,dcfd,s krill me

---

### P.S.
i'm going to throw an `[insert oddly specific item here]` at your face if you abuse my API key :sparkles: :3c :3c :3c :3c 

god save me i am so fucking tired a,c,d,c,cs,a,c,c,c,d,c,ds,cf