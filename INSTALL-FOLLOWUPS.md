# Onboarding follow-up reminders

This is the complete website folder with the follow-up update already merged.

## Install this update

1. You already installed `ambassador-onboarding.sql`. In Supabase → SQL Editor → New query, paste and run **portal/backend/ambassador-onboarding-followups.sql**. This adds the date field and updated RPCs while preserving existing notes, account links and invitation records.
2. Copy this complete website folder’s contents into your existing project, replacing matching files, then commit and push as usual.
3. Open Admin → Application Review → Onboarding. Hard-refresh if the older interface remains.

Do not rerun the original schema or older onboarding migration after this update; older function definitions would hide the new reminder fields. No Edge Function, email setting or secret needs to change.

## Use reminders

Open an accepted applicant’s checklist. Set **Next follow-up date**, write the action in internal notes, then click **Save notes & follow-up**. Examples: call about an unread invitation, arrange an introductory conversation, or confirm their first portal access.

The overview shows **Due today** and **Overdue** counts. Select the matching option in the **Next step** filter to see those applicants. Existing letter, account, sign-in and paused-access filters remain available. Counts cover all accepted applicants; search narrows the displayed cards.

Dates follow Nigeria’s calendar day (Africa/Lagos), using the database clock. Overdue means before today; due means today. Refresh the overview to recalculate reminders, including after midnight. Reminders are visible to admins only and send no automatic email.

Clear the date and save to remove a reminder. Once an ambassador is ready, the date remains visible as a previous follow-up but is excluded from active reminders. Paused accounts can still need follow-up. Declined applications are excluded. If a ready account is paused again and its date is still set, its reminder becomes active again; clear dates for completed follow-ups if this is unwanted.

Notes and dates save atomically with the same revision check. If another admin saves first, refresh before trying again. Saved dates are retained when an older compatible dashboard saves only notes. Linking an existing account and requesting an invitation also preserve the date entered in the checklist.

## Validation

71 automated tests passed locally, including calendar rollover/leap years, clear-date behavior, ready-account exclusions, notes/date payloads, concurrent changes and invitation safeguards. JavaScript syntax and HTML wiring were checked. Real database execution, hosted browser rendering and real invitation delivery require verification after installation; no deployment or email was performed here.

An optional rollback-only SQL check is included in `portal/backend/onboarding-followup-permission-tests.sql`. It requires an active admin and an active unlinked test ambassador, sends no emails, and rolls back its data changes. Appointment reference sequences may advance. It checks anonymous/ambassador denial, admin linking/date persistence, stale edits, Due Today filtering, exclusion after first sign-in and clearing the date.
