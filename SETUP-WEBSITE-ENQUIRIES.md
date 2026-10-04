# MUA website enquiry inbox

The home and contact forms now save enquiries to Supabase. **Website enquiries** in the admin dashboard includes search, progress, team assignment, internal notes and follow-up dates. Clients see a saved confirmation only after the server confirms it. WhatsApp stays available after success or failure.

This feature does not send email and does not depend on Resend verification.

## 1. Add the database feature

In your existing Supabase project, open **SQL Editor → New query**. Paste and run all of `portal/backend/website-enquiries.sql`. Success with no rows returned is normal. Do not rerun the original `schema.sql` or earlier migrations.

Only active administrators can read enquiries and update their progress. Public visitors and ambassadors cannot read the inbox. Public intake goes through the Edge Function; there is no public table insert permission.

## 2. Add two Edge Function secrets

Open **Edge Functions → Secrets**:

| Name | Value |
| --- | --- |
| `ENQUIRY_ALLOWED_ORIGINS` | `https://muaglobalinnovation.com,https://www.muaglobalinnovation.com` |
| `ENQUIRY_RATE_SALT` | A new private random string of at least 32 characters, generated with a password manager |

If you also use a GitHub Pages URL, add its actual origin separated by a comma. Origins have no path or trailing slash: for example `https://your-username.github.io`. Only include URLs you actually use.

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function runtime. Never put the service-role key or rate salt into website files.

## 3. Create and deploy the function

Create an Edge Function named exactly **submit-enquiry**. Paste the full contents of `portal/backend/functions/submit-enquiry/index.ts` and deploy it.

For this function, turn off **Verify JWT / Verify JWT with legacy secret** in its configuration. Clients submit without signing in. The included `portal/backend/config.toml` also declares `verify_jwt = false` for CLI deployment. Keep the existing invite-ambassador function and settings as they are.

Official references: [public Edge Functions](https://supabase.com/docs/guides/functions/auth), [function configuration](https://supabase.com/docs/guides/functions/function-configuration).

## 4. Upload the website

Upload the ZIP contents into the existing GitHub website repository, keeping `index.html` at the root. Replace matching files and add new ones. The connection settings in `portal/config.js` are preserved from your latest folder.

If uploading only changes, include:

- Root HTML pages (updated script/style versions; forms on index.html and contact.html).
- assets/script.js, assets/styles.css, assets/enquiry.js, assets/enquiry-core.mjs.
- portal/admin.html, portal/index.html, portal/app.js, portal/api.js, portal/enquiries.js, portal/portal.css.

Uploading the SQL and function source to GitHub does not deploy the Supabase backend. Complete steps 1–3 too.

## 5. Verify the live flow

1. Submit a short test project from the home page. Look for **Enquiry received** and the saved confirmation.
2. Sign into portal/admin.html and open **Website enquiries**. Check that the service, contact and project details match.
3. Assign a team member, mark it Contacted, add notes and today's follow-up date. Save and refresh. Check it appears under due follow-ups.
4. Mark the test enquiry Closed. It should remain searchable and leave the reminder list.
5. Send a second test from contact.html. Check both forms and the inbox on mobile.
6. An ambassador account should have no Website enquiries menu and cannot read the enquiries table.

Optional database verification: run `portal/backend/enquiry-permission-tests.sql` in the SQL Editor. It tests admin permissions, inactive accounts, duplicate intake, stale updates and rate limits. All test records roll back. Run when enquiries are quiet because it briefly locks intake.

Local tests: run `npm test` from the portal folder with Node 24 or later. These test existing portal behavior, intake validation, failures, request size, retry identity and follow-up filtering. They do not execute Postgres policies; the SQL checks above must run in your Supabase project.

## Usage and limits

- Progress: New → Contacted → Quoted → Won / Closed. These outcomes do not confirm payments. Proposals, projects, receipts and commissions keep their existing workflows.
- Assignment accepts a team member's name, so staff do not need ambassador accounts to own follow-ups.
- Refresh loads new enquiries. Follow-ups use Nigerian time and exclude Won and Closed records.
- Identical retries in the same open page reuse the request ID. Reloading or changing details starts a new request.
- Basic spam controls include a hidden trap, validation, payload limits and atomic rolling limits of five enquiries per contact per hour and 100 across the site per hour. Temporary salted contact hashes expire after an hour when another submission arrives. These controls are not a CAPTCHA; add a verified CAPTCHA if abuse develops.
- On failure the form retains client input and offers Retry or WhatsApp. WhatsApp messages are not automatically saved in this inbox.
- Customer enquiries remain stored until MUA removes them through database administration. Avoid sensitive information in forms and internal notes.
