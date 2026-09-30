# Ambassador application setup

The new page is ambassador.html, linked from all menus and footers. Existing content, photos and CNAME are preserved.

The application button is configured to open https://tally.so/r/QKP0Rg. The owner confirmed a successful test submission. Upload these updated files to your website to activate the link there; no public deployment has been performed. Applications are received by Tally, not stored in the website itself. An admin dashboard is not included.

1. Create a Google Form or Tally form in a company-controlled account.
2. Collect full name, email, phone, state/LGA, education or occupation, relevant experience, availability, motivation and a client-outreach plan. Make CV upload optional. Do not collect NIN, BVN, bank details or ID documents at this stage.
3. Require acknowledgement of commission-based compensation/no fixed salary, no guaranteed appointment, and the privacy notice. Agree rates, qualifying referrals, payment timing, cancellations and expenses in writing before appointment. No commission percentage is assumed in this website.
4. Add a privacy notice explaining the purpose, authorised reviewers, retention period and how applicants can request deletion. Keep response spreadsheets and CVs private.
5. Copy the public respondent link (not the editor link) into assets/ambassador-config.js. Supported HTTPS hosts: docs.google.com, forms.gle, tally.so.
6. Test the form from a phone and confirm a test submission arrives in your private dashboard. Check any sign-in requirement for CV uploads. Delete test responses afterwards.
7. Upload the HTML files and assets to your GitHub Pages repository root, preserving CNAME. The page URL is /ambassador.html. Check the live form and mobile menu before announcing recruitment.

Review applications, shortlist, interview and issue appointment letters manually after agreeing terms. Automatic scoring, appointment letters and an admin dashboard are not included.

To close applications: clear the URL in assets/ambassador-config.js AND close the external form to new responses.
