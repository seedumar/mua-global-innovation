# MUA Ambassador Portal — setup

This is an implementation that needs a Supabase connection before real accounts can sign in. It contains an ambassador dashboard, an admin dashboard, proposal drafts and submissions, approval or revision requests, service templates, account activation, invitations and approved-letter printing. No cloud services have been configured or deployed for you.

## 1. Create a Supabase project

Use a separate project for this portal, rather than your MUA Trust Homes database. Keep its database password private.

In Authentication, disable public user sign-ups. Configure the password minimum to at least 12 characters. Configure your email provider/SMTP for reliable invitations and password resets before production.

Set the Auth Site URL to `https://muaglobalinnovation.com/portal/index.html` and allow these redirect URLs:

- `https://muaglobalinnovation.com/portal/index.html`
- `https://muaglobalinnovation.com/portal/admin.html`
- Your local preview URL, if testing locally.

## 2. Install the database

Open the SQL Editor and run `backend/schema.sql` once in the new project. It is a first-install migration, not an idempotent update script. It creates `portal_*` tables and functions; ambassadors cannot directly insert or update those tables through the API. All mutations run through functions that check membership, ownership, status and admin permissions.

The schema denies inactive users access to services, proposals and proposal activity. Profile roles are kept in the database rather than user-editable Auth metadata. New Auth users start as inactive ambassadors.

## 3. Create your first admin account

In Supabase Authentication → Users, create or invite your own user. Use the password-reset email flow if you need to set the password.

Then run this SQL in the SQL Editor, replacing the placeholder with that account's actual email:

```sql
update public.portal_profiles
set role = 'admin', active = true, full_name = 'Umar Saeed Umar'
where id = (
  select id from auth.users where lower(email) = lower('YOUR_ADMIN_EMAIL')
);
```

Confirm exactly one matching profile was updated. The portal deliberately has no public “make me admin” button. Additional administrator roles can only be assigned by a trusted project owner using the SQL Editor.

## 4. Connect the portal

Edit `config.js`:

```js
window.MUA_PORTAL_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  publishableKey: 'YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY'
};
```

These two values are public. Never place the Supabase service-role key, a secret key, a database password or an admin password in this file, HTML, or a public GitHub repository.

## 5. Deploy the invitation function

The function calls Supabase Auth's invitation endpoint and activates an ambassador only after checking the caller's active admin profile. It requires server-side secrets.

With the Supabase CLI installed and signed in, from the `portal` directory:

```sh
supabase init
```

Copy `backend/functions/invite-ambassador` to `supabase/functions/invite-ambassador`. Add the `[functions.invite-ambassador]` configuration from `backend/config.toml` to `supabase/config.toml`. Link the CLI to this project, then set these secrets using your project dashboard or CLI:

- `PORTAL_ORIGIN`: `https://muaglobalinnovation.com`
- `PORTAL_REDIRECT_URL`: `https://muaglobalinnovation.com/portal/index.html`

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions. Check their availability in your deployment configuration; keep the service-role key server-side.

Deploy:

```sh
supabase functions deploy invite-ambassador
```

The function's gateway JWT check is disabled so it can perform its own explicit verification using `/auth/v1/user`. It always verifies the bearer token and checks the database admin role before inviting anyone. Its CORS origin must match your actual portal origin exactly.

If an email sends but activation fails, the user remains inactive. Activate that ambassador from the admin dashboard after reviewing the account. Existing users are managed through the dashboard; a duplicate email may be rejected by the Auth invitation endpoint.

## 6. Preview and publish

Serve the full website folder locally, rather than opening HTML through `file://`:

```sh
python -m http.server 8080
```

Open `http://localhost:8080/portal/`. The portal uses browser ES modules and has no npm build requirement. Use HTTPS in production. Upload the `portal` folder with the existing website files to GitHub Pages when you are ready. The public corporate site remains static; Supabase enforces authentication and permissions for portal data.

The ambassador application page includes a login link. Administrators sign in at `/portal/admin.html`, using the same account system with a database-verified admin role.

## Workflow

1. Invite an approved ambassador, or activate an existing reviewed account.
2. Ambassador creates a draft using a service template and recipient name/address.
3. Ambassador previews and submits it.
4. Admin adjusts the letter, optionally enters a quoted amount, confirms the authorised signatory and approves it—or returns it with required revision notes.
5. Ambassador can print the approved letter and choose **Save as PDF** in the browser print dialog.

There is no automatic email to the recipient, no commission/payment tracking, and no uploaded signature image in this version. The signatory is a typed name/title controlled by admin approval. Approved letters are immutable through the portal API. To correct an approved letter, create and approve a new proposal and handle withdrawal of the old one through your operating process.

## Required live verification before launch

Run the automated tests with `npm test` (or `node --test tests/*.test.js`). Then use the SQL Editor to run `backend/permission-tests.sql`; it rolls back its test records.

Complete the following in the connected portal with one admin and two ambassador accounts:

- Check invitation delivery, password setup, password reset and sign-out.
- Ambassador A must not see or update Ambassador B's proposal, even with a manually altered API request.
- An ambassador must not approve a proposal, change a role or update pricing/signatories.
- Deactivating an ambassador must prevent subsequent data requests and mutations.
- Test draft → submission → revision → resubmission → approval and stale-tab/double-click handling.
- Edit a service template; existing approved letters must keep their original text.
- Check mobile layouts and print long letters as PDF, including addresses and multi-page bodies.

Database integration, invitation email delivery and visual browser review have not been run in a live Supabase project. Sessions are held in session storage for the current browser tab; clearing the tab's stored data signs the user out. Do not add untrusted HTML, third-party analytics scripts or secret credentials to the portal.
