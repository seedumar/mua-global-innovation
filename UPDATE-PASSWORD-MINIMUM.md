# Minimum password length: 8 characters

Upload portal/index.html and portal/admin.html to your GitHub website, replacing the existing files. Once deployment finishes, refresh the portal with Ctrl + Shift + R. Both the new-password and confirmation fields now require at least 8 characters. Existing passwords stay valid.

In Supabase, check Authentication → Sign In / Providers → Email (or the Password Security settings in your dashboard layout). If Minimum password length is currently 12, change it to 8 and save. The Supabase server rule must allow 8 characters too.

If you installed the branded reset email, replace its body in Authentication → Email → Templates → Reset password with portal/email-templates/reset-password.html from this ZIP. Its wording now says at least 8 characters. Keep the existing subject and {{ .ConfirmationURL }} placeholders.

No SQL or Edge Function changes are needed. The package includes the full latest website with Trust Homes and the enquiry inbox.
