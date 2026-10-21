# Sign-in emails

Customers sign in with their email address and a 6-digit code. There's no
password. The same email also has a button that signs them in on the device
where they open it. Checkout never needs an account.

These two files are the emails Supabase sends. They're styled to match the
shop and use the logo from `public/email/dear-corner-logo.png`.

| File                | Paste into (Supabase → Authentication → Emails) | Subject                                          |
| ------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `magic_link.html`   | **Magic link**                                  | `Your Dear Corner sign-in code: {{ .Token }}`    |
| `confirmation.html` | **Confirm signup**                              | `Welcome to Dear Corner: your code {{ .Token }}` |

Both emails must keep `{{ .Token }}` (the code) and `{{ .ConfirmationURL }}`
(the button). The logo comes from `{{ .SiteURL }}`, so set the Site URL first.

## One-time setup (owner)

1. **Send from the shop's Gmail.** Authentication → Emails → SMTP settings →
   turn on custom SMTP:
   - Sender email: `dearcorner.bd@gmail.com`, sender name: `Dear Corner`
   - Host `smtp.gmail.com`, port `465`
   - Username `dearcorner.bd@gmail.com`
   - Password: a Google **app password**. To get one, turn on 2-Step
     Verification in the Google account, then go to Google Account →
     Security → App passwords. Don't use the normal Gmail password.

   Without custom SMTP, Supabase sends only a few emails an hour, from its
   own address, for testing.

2. **Addresses.** Go to Authentication → URL Configuration.
   - Site URL: `https://dearcornerbd.vercel.app`, or the shop's own domain
     once it has one.
   - Redirect URLs: add `https://dearcornerbd.vercel.app/**`. If you test
     sign-in on Vercel previews, also add your preview address pattern, for
     example `https://dear-corner-*-<your-vercel-team>.vercel.app/**`.
3. **Templates.** Go to Authentication → Emails → Templates. Paste each file
   above into the matching template and set the subject.
4. **Code settings.** Go to Authentication → Providers → Email.
   - Keep **Enable Email provider** and **Confirm email** on.
   - Email OTP length: 6.
   - Email OTP expiration: 3600 seconds (the email says one hour).

Phone (SMS) sign-in is left out until an SMS provider is chosen.
