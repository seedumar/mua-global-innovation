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

There is no automatic email to the recipient, no automatic money transfers, and no uploaded signature image in this version. The signatory is a typed name/title controlled by admin approval. Approved letters are immutable through the portal API. To correct an approved letter, create and approve a new proposal and handle withdrawal of the old one through your operating process.

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


## Project quotation and payment details

Enter the total project cost in the admin review before approving the proposal. The letter includes the selected service, total cost, a 60% deposit, and a 40% remaining balance. Calculations use kobo rounding so the deposit and balance add up to the total. If no price is entered, the letter states that the project cost is to be agreed; it does not show a zero-price quote.

Payment details: Moniepoint; account name Mua Global Innovation Ltd; account number 6520592152. These company details and the 60/40 split are applied when viewing or printing letters, including existing proposals. Replace the portal folder to deploy this update; no database migration is required.


## Enable the client outreach tracker (existing portal)

1. Open Supabase → SQL Editor → New query. Paste the full contents of `backend/outreach-tracker.sql` and run it. This adds a new table and its access rules; existing proposals and accounts remain intact. Do not rerun `backend/schema.sql`. The outreach script can be rerun if needed.
2. Replace the complete `portal` folder on GitHub with this version. Refresh your browser with Ctrl+Shift+R. No Edge Function or authentication settings need changing.
3. Sign in and open Client outreach. Add a company, contact details, progress stage, follow-up date and conversation notes.
4. Ambassadors see and update their own leads. Admins see and update all leads. Inactive accounts have no access. Follow-ups due today and overdue are highlighted using Nigerian time; Won and Lost leads are excluded from reminders. These are dashboard reminders, not email notifications.
5. The proposal details panel has an Add to client outreach button that copies the recipient details and proposal reference into a new lead. Check for an existing company before adding it again. Creating or approving a proposal does not automatically change lead progress.

The portal keeps proposal features available if the outreach table has not yet been installed, and shows a setup message in Client outreach. Optional database verification: run `backend/outreach-permission-tests.sql`; its temporary users and records are rolled back. Live database verification must be completed in your Supabase project after installation.


## Ambassador performance reports

Replace the portal folder and hard refresh to add Performance reports in the admin dashboard. No additional SQL is required once the outreach tracker is installed. Reports use all-time ambassador-owned leads and proposals, including inactive ambassadors; admin-owned records are excluded. Search, access filters and sorting update the report, and summary cards reflect the filtered ambassadors. View leads opens outreach filtered to that ambassador.

Conversion means leads currently marked Won divided by all leads belonging to the ambassador; ambassadors with no leads show a dash. Won counts depend on the manually recorded lead stage and do not confirm revenue or payment. If outreach cannot load, its metrics show dashes rather than misleading zero counts; proposal counts remain available.


## Enable project delivery (existing portal)

1. In Supabase SQL Editor, run `backend/project-delivery.sql`. This adds an admin-only project table and save function. It can be rerun safely. Do not rerun `schema.sql`.
2. Replace the portal folder on GitHub and hard refresh. Sign in as an active admin and open Project delivery. Ambassadors cannot view or change delivery or payment records. Assigned team member is a name for coordination; it does not grant portal access.
3. Add the client, service, assigned team member, deadline, total cost and cumulative confirmed payments received. Record payment references and dates in Payment notes. Check bank records before recording a payment. The 60% deposit is a suggested expected amount, never automatically recorded as received.
4. Update progress from Not started to In progress, Client review and Completed. The balance equals cost minus confirmed received payments. Completed projects can still have an outstanding balance. Overdue means an unfinished project with a deadline before today in Nigerian time.
5. Approved proposal details provide Create delivery project, which copies the client, service, quoted amount and proposal reference. Check for an existing project first. Delivery progress is independent of the outreach lead stage.

Saving a stale project version is rejected; refresh and reopen before re-entering changes. Proposal/outreach features remain available if delivery is not yet installed. Optional live verification: run `backend/project-permission-tests.sql`; test users and projects roll back. Local unit and UI checks do not substitute for installing and verifying the policies in your Supabase project.


## Enable invoices and receipts

1. After project-delivery.sql is installed, run `backend/invoices-receipts.sql` in Supabase SQL Editor. It adds immutable document snapshots, document references and a payment safeguard. Do not rerun schema.sql.
2. Upload this portal folder and hard refresh. In Project delivery, select Invoices / Receipts for a saved project.
3. Issue invoice saves a numbered invoice with the current client, service, cost, deposit, confirmed payments, outstanding balance and MUA bank details. Check the existing list before issuing another invoice.
4. Confirm the received cumulative amount in Project delivery against actual bank records first. Then Issue payment receipt for one verified transaction: enter its amount, actual date, payment method and reference, and confirm verification. Existing confirmed payments are not automatically converted into receipts. The receipt total cannot exceed payments confirmed but not yet receipted. Duplicate references on the same project are blocked.
5. View / Print opens a document on the latest MUA letterhead. Print / Save as PDF uses the browser print dialog. Each issued document keeps its original financial and client details even when the project is later updated. The printed outstanding balance is explicitly the balance at issue time. Receipts do not add another payment to the project total.

Documents are admin-only and cannot be edited or deleted by portal users. Confirmed payments cannot be reduced below issued receipt totals. Save project changes before issuing a document; stale project versions are rejected. This feature records documents and manually verified payments; it does not connect to Moniepoint or email documents automatically. If the documents table has not been installed, the Invoices / Receipts button will report the request error while Project delivery remains usable.

Optional live checks: run `backend/document-permission-tests.sql`; its data is rolled back. Database tests must be run in your project after installation; local checks cover calculations and document rendering only.


## Fixed ambassador commissions

1. Run `backend/commissions.sql` in the existing Supabase project after project-delivery.sql. Do not rerun schema.sql. Upload this portal folder and hard refresh.
2. Admin: open Project delivery → Commission, or Commissions → Assign commission. Choose the project and ambassador, set a fixed NGN amount, and approve it. One commission record is supported per project. Unapproved records are visible only to admins.
3. Half the fixed commission becomes eligible when the confirmed cumulative client payments reach the required 60% deposit. The full commission becomes eligible after the full project cost is confirmed as received. No commission is eligible for a zero-cost project. Amounts round to kobo, with the second half preserving the agreed total.
4. Eligibility is recalculated in the database when project costs or payments change. Record actual commission payouts separately as the cumulative Confirmed commission paid amount, with transfer dates and references. Saving records does not send money. Payouts cannot exceed eligibility or be reduced after confirmation. Paid terms cannot be reassigned or changed. Project payment changes that would invalidate a paid commission are rejected.
5. Ambassadors can read only their own approved commission records and payout notes. They cannot approve terms or record payouts. Existing admins retain all records, including commissions assigned to inactive ambassadors.

Optional live verification: run `backend/commission-permission-tests.sql`; its test data rolls back. Local tests verify arithmetic and UI structure. Install and verify the database policies in your Supabase project before relying on access isolation.

## Domain, hosting and work fees

Run `backend/project-fees.sql` in the existing Supabase project after project-delivery.sql, then replace the portal folder and hard refresh. Do not rerun schema.sql.

In Project delivery, enter the domain and hosting fees (0 for none), or leave both blank until known. Existing projects keep an unknown breakdown until an admin enters it. Work fee is calculated as total project cost minus domain and hosting fees. Combined fees cannot exceed the cost. Admin-only access and stale-edit protection also apply to these fields.

The commission editor shows these costs before the admin enters an agreed fixed commission. This is a review aid, not a commission percentage or profit calculation: it does not deduct other expenses. Existing commissions and issued invoice/receipt snapshots remain unchanged. Client terms stay 60% deposit / 40% balance; the fixed commission becomes payable 50% after that deposit and 50% after full client payment.

Optional live database checks: `backend/project-fee-permission-tests.sql` (test data rolls back).
