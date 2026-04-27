# FindIt

FindIt is a smart institutional lost-and-found web application for CVR that combines:

- public item search without login
- restricted reporting through institutional ID authentication
- salted one-way password hashing
- admin-controlled visual verification before release
- Vercel-backed persistent storage for shared accounts and reports

## Open

Open [index.html](/Users/bollakanakabhargav/Documents/Codex/2026-04-21-smart-institutional-lost-and-found-platformclaude/index.html) in a browser.

Optional local server:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Updated Security Model

- Public visitors can browse active `Lost` and `Found` items by category and location.
- Restricted actions require login with an institutional ID matching `XXB81AXXXX`.
- New user registration requires the email format `XXB81AXXXX@cvr.ac.in`, matching the same institutional ID.
- Passwords are stored as salted PBKDF2-SHA256 hashes, not plain text.
- Existing users can use a forgot-password flow with OTP verification against their stored institutional email.
- Returned items are removed from the public gallery and preserved in audit history.

## Seeded Access

Admin accounts:

- `navadeep` / `26B81A0001`
- `cvr_college` / `26B81A0002`

Seeded standard user:

- `ishita` / `26B81A1024`

You can also register additional non-admin users from the app.

## Included Flows

- public category and location search without authentication
- normalized relational-style client data for accounts, profiles, reports, media, fingerprints, matches, notes, and audit history
- protected lost/found reporting
- forgot-password flow with OTP generation, expiry, reset verification, and server-backed email dispatch
- persistent user storage across devices through Vercel Blob
- claim requests from users on public items
- administrator deletion of lost/found posts
- visual fingerprint generation and high-confidence match suggestion
- admin side-by-side match verification
- verified and returned lifecycle handling
- localStorage persistence using the updated state model

## OTP Delivery Setup

The app now uses a Vercel serverless function at `/api/send-otp` for OTP dispatch through Gmail SMTP.

To enable live email sending on Vercel, configure these environment variables:

- `SMTP_USER`
- `SMTP_PASS`
- `OTP_FROM_EMAIL` (optional, defaults to `SMTP_USER`)

Recommended Gmail setup:

- enable Google 2-Step Verification
- generate a Google App Password
- use the Gmail address as `SMTP_USER`
- use the App Password as `SMTP_PASS`

Without those variables, password-reset requests will fail with a mail-configuration error instead of exposing OTPs in the UI.
