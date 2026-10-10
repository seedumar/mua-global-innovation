# MUA website review — 10 October 2026

Reviewed the uploaded website source and supplied an additive fixes package. Your original upload is retained. This ZIP contains only new or changed files; merge it into the existing project and replace matching files.

## Fixes
- Reconnected the home and contact forms to the existing submit-enquiry function. The forms now save an enquiry and offer WhatsApp as an additional path.
- Removed the competing WhatsApp-only submit handler from project-wizard forms.
- Restored the admin Website enquiries menu, inbox, detail editor and data loading.
- Corrected new-password and confirmation fields from 12 to 8 characters, matching the existing reset-email wording. Supabase's password policy must also be 8, as previously configured.
- Moved the application review script into the admin document body and updated asset cache versions.
- Added direct live MUA Trust Homes links on home and ventures and corrected the home status from Active build to Live platform. The current page and team layouts are preserved.
- Retired the old public Website proposal page into a redirect to the enquiry form. Existing proposal letters inside the portal remain available.
- Added pagination to dashboard lists so totals and reports can include more than the first API page.
- Included the missing application review and appointment SQL/setup test sources, plus the new feature tests in the main test command.
- Consolidated local Edge Function configuration. Public intake functions check submissions themselves; invite-ambassador validates the supplied user JWT and active admin profile in its server code.

## Payment terms checked
The existing client terms are 60% deposit / 40% balance. Ambassador commission is a separate fixed amount, paid in two 50% portions: after the required client deposit and after full client payment. This review did not change financial formulas, previously issued letters, bank details or payment records.

## Checks completed
- 47 local automated tests passed: portal auth, permissions-related client logic, payments, receipts, enquiries, backend enquiry validation, mobile navigation logic, application reviews, appointment inputs and integration regressions.
- Syntax checks passed for all 35 JavaScript/module files.
- 12 HTML files checked: no broken local asset/page/anchor links or duplicate IDs. Email placeholders are intentionally excluded from link checking.
- All six main public pages have six menu links.
- No obvious embedded private credential patterns were found in the checked source. Public Supabase and Turnstile site keys are expected in frontend configuration. This is a limited scan, not proof of security.

## Upload
1. Extract this ZIP.
2. Copy the files and folders into your CURRENT website project. Replace matching files; keep other project files.
3. Commit/upload your changes using your usual GitHub workflow.
4. Open the website and use Ctrl + Shift + R on PC. Test normally and in a private window if an old cache persists.

No new database migration is required for the restored features if you already deployed website-enquiries.sql, application-review.sql and appointment-letters.sql. If a feature reports a missing table/function, run ONLY that feature's additive migration in SQL Editor. Do not rerun the original portal schema or application schema as a general update.

## Final live checks
This was a source and automated logic review. No changes were deployed to GitHub, Supabase, Cloudflare or Resend. Automated visual and print checks could not run because this environment has no installed browser.

- Submit one test enquiry from both the home and contact pages. Verify each record in Admin → Website enquiries, then update its progress.
- Submit a test ambassador application. Review it, shortlist it, then accept it. Confirm the sidebar stays visible on PC and the mobile menu opens and closes correctly.
- Generate an appointment letter. Check applicant name and date, print/save a PDF, then reopen to confirm the same reference and original wording.
- Check as a regular ambassador that application records, appointment letters, admin enquiries and other users' private information are inaccessible. Run the included feature permission SQL tests with test accounts if not already done.
- Test an 8-character password through the reset link; if Supabase rejects it, check the Email provider policy.

## Remaining limits
- The application form uses server-verified Turnstile but has no persistent submission rate limit or duplicate-email block. A lost response can lead an applicant to submit twice.
- Acceptance, appointment issuance and portal invitation are separate actions. Issuing does not send an email or activate an account.
- Appointment letters cannot yet be corrected, cancelled or acknowledged digitally. A later applicant status change does not revoke an issued letter.
- The application privacy wording proposes deletion of unsuccessful records after six months. No automatic retention cleanup is implemented.
- Live Row Level Security policies, Edge Function secrets, email delivery, browser layout and printer output need verification in your deployed project. Local test success does not verify those settings.

## Files in this update
- assets/script.js
- assets/styles.css
- contact.html
- index.html
- portal/admin.html
- portal/api.js
- portal/app.js
- portal/backend/application-review-permissions.sql
- portal/backend/application-review.sql
- portal/backend/appointment-letter-permissions.sql
- portal/backend/appointment-letters.sql
- portal/index.html
- portal/package.json
- portal/portal.css
- portal/tests/api.test.js
- portal/tests/applications.test.mjs
- portal/tests/appointments.test.mjs
- portal/tests/site-integration.test.js
- proposal.html
- supabase/config.toml
- ventures.html
