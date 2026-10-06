# Raise Local Live Gmail Authentication Instructions

Prepared for Cherice, Tenyse, and Jessica  
Use this to finish connecting live Gmail notifications for `https://app.raiselocal.fund`.

## Purpose

Raise Local uses the Gmail API to send live platform notifications, including match notifications, approval updates, status changes, admin alerts, and test emails.

The Google Cloud setup may already be complete, but the deployed Render app still has to be connected to the Gmail account that will send the messages. This connection is completed through Google OAuth. Cherice does not need Tenyse's Gmail password or Jessica's Gmail password.

## Important Security Notes

- Do not paste Gmail passwords, Google client secrets, setup tokens, refresh tokens, or API keys into email, Google Docs, Slack, GitHub, screenshots, or chat.
- The person who owns the sending Gmail account should complete the Google sign-in step themselves.
- The setup token should be copied directly from Render into the setup URL.
- If the meeting is recorded, hide secret values before opening Render environment variables.
- Use the Verified Consulting / Raise Local Google account that should send official Raise Local notification emails.

## What Should Be True When Setup Is Finished

When live Gmail is connected, this status page:

```text
https://app.raiselocal.fund/api/gmail/status
```

should show:

```json
{
  "configured": true,
  "connected": true,
  "notificationEmail": true,
  "testRecipientEmail": true,
  "appBaseUrl": true,
  "setupTokenRequired": true
}
```

The key field is:

```text
connected: true
```

If `connected` is `false`, the live site is not ready to send Gmail notifications yet.

## Before You Start

Make sure you have access to:

1. Render dashboard for the `raise-local-platform` service.
2. Google Cloud Console for the Verified Consulting / Raise Local Google project.
3. The Gmail account that should send Raise Local notifications.
4. The live app URL:

   ```text
   https://app.raiselocal.fund
   ```

## Step 1: Confirm Render Environment Variables

1. Open Render.
2. Go to the `raise-local-platform` web service.
3. Open **Environment**.
4. Confirm these variables exist:

```text
APP_BASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GMAIL_SETUP_TOKEN
GMAIL_NOTIFICATION_EMAIL
GMAIL_TEST_RECIPIENT_EMAIL
GMAIL_ADMIN_EMAILS
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DEMO_ACCESS_TOKEN
```

For the live domain, these should be aligned:

```text
APP_BASE_URL=https://app.raiselocal.fund
GOOGLE_REDIRECT_URI=https://app.raiselocal.fund/api/gmail/oauth2callback
```

If `GOOGLE_REDIRECT_URI` still uses the old Render URL, update it to the custom domain callback above.

After changing Render environment variables:

1. Save changes.
2. Redeploy or restart the Render service.
3. Wait for the deploy to finish.

## Step 2: Confirm Google Cloud OAuth Redirect URI

1. Open Google Cloud Console.
2. Make sure the active project is the Verified Consulting / Raise Local project.
3. Go to **APIs & Services**.
4. Go to **Credentials**.
5. Open the OAuth client used by Raise Local.
6. Confirm the OAuth client type is **Web application**.
7. Under **Authorized redirect URIs**, confirm this exact URI is listed:

```text
https://app.raiselocal.fund/api/gmail/oauth2callback
```

If it is missing:

1. Add it.
2. Save the OAuth client.
3. Wait a minute for Google Cloud to apply the change.

Optional but helpful during transition:

```text
https://raise-local-platform.onrender.com/api/gmail/oauth2callback
```

Keep the old Render callback only if the team still tests from the Render subdomain.

## Step 3: Open The Live Gmail Connect URL

In Render, copy the value of:

```text
GMAIL_SETUP_TOKEN
```

Then build this URL:

```text
https://app.raiselocal.fund/api/gmail/connect?setup_token=PASTE_SETUP_TOKEN_HERE
```

Open that full URL in the same browser where the sender Gmail account is signed in.

Do not paste the completed URL into shared docs if it contains the real setup token.

## Step 4: Authorize Gmail

Google should open an authorization screen.

1. Choose the Gmail account that should send Raise Local notifications.
2. Confirm the project/app name is connected to Raise Local / Verified Consulting.
3. Approve the Gmail sending permission.
4. Continue through the Google consent screens.

Raise Local should only need Gmail sending access. It should not need the Gmail password.

## Step 5: Confirm The Redirect Worked

After approval, Google should redirect back to the Raise Local app.

If the authorization succeeds, the app should complete the connection without asking for a Gmail password.

Then open:

```text
https://app.raiselocal.fund/api/gmail/status
```

Confirm:

```text
connected: true
```

## Step 6: Send A Hosted Test Email

After `connected` is `true`, send one hosted test notification from the live site.

Use the pilot inbox first:

```text
GMAIL_TEST_RECIPIENT_EMAIL=cherice.heron@pursuit.org
```

Recommended test order:

1. Confirm `GMAIL_TEST_RECIPIENT_EMAIL` points to the pilot inbox.
2. Log into Raise Local as an admin.
3. Trigger the test email route or a controlled notification flow from the hosted site.
4. Confirm the pilot inbox receives the email.
5. Only after the pilot test succeeds, test real notification recipients.

## Step 7: What To Tell Cherice After Setup

Send Cherice a short confirmation:

```text
I completed the Gmail authorization step for Raise Local.
Please check the live Gmail status and send the test notification.
```

Do not send Cherice the Gmail password, OAuth secret, refresh token, or setup token.

## Troubleshooting

### Status still says `connected: false`

Check these in order:

1. Render has `GOOGLE_CLIENT_ID`.
2. Render has `GOOGLE_CLIENT_SECRET`.
3. Render has `GOOGLE_REDIRECT_URI`.
4. Render has `GMAIL_SETUP_TOKEN`.
5. Render has `APP_BASE_URL`.
6. `GOOGLE_REDIRECT_URI` exactly matches the Google Cloud OAuth redirect URI.
7. The setup URL used the current Render `GMAIL_SETUP_TOKEN`.
8. The Render service was redeployed after env changes.

Then repeat the setup URL.

### Google says redirect URI mismatch

This means the redirect URI in Render and Google Cloud do not match exactly.

Confirm both places use:

```text
https://app.raiselocal.fund/api/gmail/oauth2callback
```

Watch for:

- Missing `https`.
- Extra slash at the end.
- Old Render domain instead of `app.raiselocal.fund`.
- Typo in `oauth2callback`.

### Google shows an app warning

This can happen if the OAuth app is still internal/testing or not fully verified.

Only continue if:

- The Google Cloud project is the Verified Consulting / Raise Local project.
- The Gmail account belongs to the team that should send notifications.
- The requested permission is for Gmail sending.

### Setup succeeds but emails still do not send

Check:

1. `https://app.raiselocal.fund/api/gmail/status` shows `connected: true`.
2. `GMAIL_NOTIFICATION_EMAIL` is set.
3. `GMAIL_TEST_RECIPIENT_EMAIL` is set for pilot testing.
4. `GMAIL_ADMIN_EMAILS` includes the admin recipients.
5. The user triggering the test is logged in as an admin.
6. The latest GitHub commit is deployed on Render.

## Final Verification Checklist

Before handoff, confirm:

- Live status page shows `configured: true`.
- Live status page shows `connected: true`.
- Live status page shows `notificationEmail: true`.
- Live status page shows `testRecipientEmail: true`.
- Live status page shows `appBaseUrl: true`.
- A hosted test email reaches the pilot inbox.
- A real hosted notification can be triggered from the live app.
- Tenyse and Jessica know the sending Gmail account must stay connected.

