---
title: Single sign-on loops or cannot sign in to a web app
category: Account/Access
---

# Single sign-on loops or cannot sign in to a web app

Use this guide when signing in to a company web app keeps returning you to the sign-in page, the page shows "Something went wrong", "AADSTS" error codes, "You can't get there from here", "Your sign-in was blocked", or the app says you are not assigned to it.

## Sign-in keeps looping

1. Open a private (InPrivate or Incognito) browser window and sign in there. If it works, the problem is old cookies.
2. Clear cookies for the sign-in site: browser settings > **Privacy** > **Cookies and site data**, then remove data for `login.microsoftonline.com` and the app's site.
3. Sign out of every work account in the browser, close all browser windows, then sign in once with your work account.
4. If you use more than one work or personal Microsoft account, use a separate browser profile for each.
5. Check the computer date and time are set automatically.

## "You can't get there from here" or sign-in blocked

1. Some apps only allow company-managed devices or the company network. Try from your work laptop, or connect to the VPN first.
2. Update the browser and the operating system; outdated devices can be blocked.
3. If you recently changed your password, sign out everywhere and sign in with the new one.

## "You are not assigned" or access denied

The app has not been given to your account. Request access through a ticket; the app owner must approve it.

## Error codes

Note the code that starts with `AADSTS` and the **Correlation ID** and **Timestamp** shown under **More details**. These let the service desk find the exact failure.

## When to escalate

Raise a ticket with the app name, the error code, correlation ID and timestamp, and the device you used. If you see sign-in prompts or MFA requests you did not start, deny them, change your password and report it as a security issue.
