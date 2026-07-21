# Vaultline — Auth UI

A dark, "keycard"-themed login and registration interface built with plain HTML, CSS, and JavaScript. No frameworks, no build step, no backend required to run it.

**[Live demo](https://your-username.github.io/vaultline-auth-ui/)**

## Features
- Login and registration forms in a single-page toggle view
- Real-time field validation (email format, password length, match checks)
- Password strength meter with live feedback
- Show/hide password toggle
- Passwords hashed client-side with SHA-256 (`crypto.subtle`) before storage
- Accounts persisted locally via `localStorage` — works fully offline, no server needed

## Getting started
Clone the repo and open the file in a browser:

\`\`\`bash
git clone https://github.com/your-username/vaultline-auth-ui.git
cd vaultline-auth-ui
open vaultline-single-file.html   # or just double-click it
\`\`\`

## ⚠️ Important note on security
This is a **client-side demo**, not a production auth system. Passwords are hashed in the browser and stored in `localStorage`, which means:
- Data is only visible in that one browser, on that one device
- Anyone with dev tools access to that browser can read stored (hashed) data
- Client-side hashing does **not** replace server-side hashing — it just avoids storing plain text locally

To make this production-ready, swap the storage layer for real API calls to a backend that hashes passwords with bcrypt or argon2 and uses salted, server-side verification. See the comments at the bottom of the `<script>` block for a starting point.

## License
MIT.
