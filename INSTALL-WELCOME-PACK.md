# Ambassador Welcome Pack

This complete website folder already includes the welcome pack, onboarding checklist, follow-up reminders and earlier fixes.

## Install

No new SQL migration or Edge Function is needed for the Welcome Pack. Keep the onboarding and follow-up migrations you already installed.

Copy this folder’s contents into your existing website checkout, replacing matching files, then commit and push through your usual deployment. Refresh the portal after deployment; a private window can help if the browser keeps an older script.

## What ambassadors see

After signing in, ambassadors land on **Welcome pack**. It remains available in the desktop sidebar and mobile menu. Admins continue to land on their existing proposal dashboard.

The pack explains their responsibilities, the outreach routine, proposal preparation and approval, commission milestones and support contacts. Available service names come from the active service templates already in Supabase.

The three-step checklist uses only the current ambassador’s portal records:

1. Record their first lead.
2. Prepare their first proposal (including a saved draft).
3. Submit a proposal for review. Submitted, changes-requested and approved records count here because they have reached the review workflow.

The checklist updates after saves and when the dashboard refreshes. It does not track whether someone read the guide, completed training, digitally accepted an appointment or won a sale. If outreach records cannot load, that step shows Unavailable rather than a false zero.

The guide preserves the existing financial rules: an admin-approved fixed commission per project, with 50% payable after the required client deposit and the other 50% after full client payment. The current application requires a 60% client deposit. The 50/50 commission split is separate from that client deposit. No prices, deposit calculations, commission calculations or bank details were changed.

Welcome buttons open existing forms or views; they do not submit proposals, send invitations or contact MUA automatically. WhatsApp and telephone links open only when selected.

## Verify after deployment

Sign in as an ambassador and check the Welcome Pack on desktop and mobile. Confirm the two main buttons open the existing lead and proposal forms. Save a lead and a draft; the first two checklist steps should complete. Submit the proposal; the third should complete. Verify that another ambassador’s records do not contribute to their checklist, and that admin navigation still works.

Local automated tests and JavaScript syntax checks cover the logic and wiring. Hosted rendering and live Supabase sessions need verification after upload; no deployment or messages were sent while preparing this update.
