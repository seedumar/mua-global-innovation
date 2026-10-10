# Ambassador onboarding update

This update adds **Applications / Onboarding** tabs inside the existing admin Application Review panel. It also includes the previously supplied website review fixes so the portal files stay compatible.

## Install

1. Back up your current website and Supabase database.
2. Your existing portal schema, ambassador application schema, `portal/backend/application-review.sql` and `portal/backend/appointment-letters.sql` must already be installed. Do not rerun the original portal schema on a working project. If the review or appointment tables are missing, install those additive migrations first.
3. In Supabase → SQL Editor → New query, paste the complete contents of **portal/backend/ambassador-onboarding.sql**, then Run. A successful query may say “Success. No rows returned.”
4. Merge this folder into your latest website project, replacing the matching files. Keep all unrelated pages, images and configuration. Do not upload the ZIP itself as the website.
5. Commit/push the updated website files and let your existing hosting deploy. Refresh the dashboard; if old code remains, hard-refresh or test in a private window.

The existing `invite-ambassador` Edge Function is reused. You do **not** need to create a new function, insert another endpoint or change your Turnstile/Resend settings for this feature. Its existing admin authentication checks must remain enabled in the function code.

## Use

Open Admin dashboard → Application Review → **Onboarding**. Only accepted applicants appear.

1. Open the applicant’s checklist.
2. Issue the appointment letter, close its preview, then click **Refresh checklist**.
3. If the applicant already has an ambassador account with the same email, select it and **Link existing account**. This sends no email and does not enable paused access.
4. Otherwise, choose **Request portal invitation** and confirm the email shown. A successful request links the new account. “Invitation requested” is not proof that an email arrived.
5. The ambassador opens the invitation, sets their password and signs into the updated portal. A successful active workspace load records their first portal access after this update.
6. An issued letter, linked active account and recorded portal sign-in make the checklist **Ready to start**. This does not represent a digitally signed appointment.

Internal notes are visible to administrators only. Changes use revision checks to prevent silently overwriting another admin’s update. A linked account cannot be reassigned through this interface or reused for another application.

## Existing accounts and failures

Older sign-ins are not backfilled: existing ambassadors must open the updated portal once. Account access is still controlled through Admin → Ambassadors. Accepting an application does not itself send an email.

If an invitation times out, **do not keep resending**. Refresh the checklist first. If an account was created, link the matching account. If an existing Auth user has no ambassador profile, correct the profile through your established account-administration process; do not delete their account to force another invitation.

“Onboarding changed” means another admin saved first. Refresh, review the latest state and re-enter any unsaved notes. A missing-function message means the new SQL migration has not been installed or the schema cache has not refreshed.

## Verification

Local automated tests cover the workflow rules, selector wiring, server guard presence, existing-account handling and invitation/sign-in distinction. JavaScript syntax is checked. Browser rendering, real email delivery and database execution require testing on your hosted Supabase project; no invitations or deployments were performed while preparing these files.

After installing, check that an ambassador cannot open admin onboarding; an admin can issue/link an accepted application; a paused account stays paused; sign-in changes the checklist only for its own linked account; and a second admin with stale notes is asked to refresh. Use test accounts and avoid sending invitations to real applicants during verification.
