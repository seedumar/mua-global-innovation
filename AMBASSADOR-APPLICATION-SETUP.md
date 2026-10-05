# MUA Ambassador Application

A custom three-step application page for the existing MUA website. Includes your logo and brand colours, mobile layout, required-field validation, review screen, accessible labels, private database storage and server-verified spam protection.

## Preview
Open ambassador-application.html in a browser. You can complete all three steps. Submission is intentionally unavailable until the backend is connected; no fake success or browser-only storage is used.

## Add to the website
1. Copy ambassador-application.html and the assets in this package into your existing website root, merging the assets directory.
2. Change the application link on ambassador.html to `ambassador-application.html`. Stop loading the old assets/ambassador.js on that page if it overrides the link back to Tally. Keep your existing portal and other pages.
3. In your intended Supabase project, run supabase/schema.sql in the SQL Editor. It creates only a new applications table and restricts browser access.
4. Create an Edge Function named `ambassador-apply` using supabase/functions/ambassador-apply/index.ts. Disable its JWT verification because applicants do not need accounts. With the CLI, merge the supplied config.toml function section into your existing configuration and deploy this function.
5. Create a Cloudflare Turnstile widget for muaglobalinnovation.com and www.muaglobalinnovation.com. Copy the site key into assets/application-config.js. Set TURNSTILE_SECRET_KEY as a secret on the Supabase function. Never place this secret or the service-role key in frontend files.
6. Set ALLOWED_ORIGINS to your actual website origins, comma separated. Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to hosted functions. Verify these are available server-side.
7. Set the config endpoint to `https://YOUR-PROJECT.supabase.co/functions/v1/ambassador-apply`.
8. Review the form’s programme and privacy wording before launch. The six-month unsuccessful-application retention is proposed wording; schedule and perform deletion if you adopt it. No automatic deletion job or confirmation email is included.
9. Submit a test application on the deployed website. Confirm its row is in the private Supabase Table Editor, then delete the test row. Confirm failed security checks do not create rows.

## Reviewing applications
Use your authorised Supabase account and Table Editor → mua_ambassador_applications. Filter by state or status. Change status to shortlisted, accepted or declined as needed. A dedicated website admin review interface is not included in this package. The existing ambassador portal is left unchanged.

## Important limits
No live deployment or database modification has been performed. Live submission depends on the above setup and an end-to-end test. Turnstile mitigates automated spam; this version has no persistent per-IP rate limiter or duplicate-email block. A network interruption after saving can lead to a duplicate if the applicant retries. Monitor use and apply additional limits if needed. Application answers remain in memory while moving between steps and are cleared by refresh; no personal data is kept in browser storage.

## Documentation
- https://supabase.com/docs/guides/functions/function-configuration
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
