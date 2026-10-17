---
title: Outlook not receiving or sending email, or not syncing
category: Email
---

# Outlook not receiving or sending email, or not syncing

Use this guide when new emails do not arrive in Outlook, messages stay in the Outbox, Outlook shows "Disconnected" or "Working offline", or the mailbox looks out of date compared with webmail.

## First, check webmail

Open `https://mail.helpdesk.local` in a browser and sign in. If email works there, the problem is the Outlook app on your computer and the steps below apply. If webmail also fails, raise a ticket because it may be a service outage.

## Outlook says "Disconnected" or "Working offline"

1. On the **Send / Receive** tab, make sure **Work Offline** is not highlighted. Click it to turn it off if it is.
2. Check your internet connection, and connect to the VPN if you are remote.
3. Close Outlook completely and open it again.

## Emails stuck in the Outbox

1. Open the Outbox and check for a message with a very large attachment (over 25 MB). Delete it or move it to Drafts and send a share link instead.
2. Click **Send / Receive All Folders**.

## Mailbox not updating

1. Close Outlook, then open it again and wait a few minutes for it to sync.
2. Go to File > Account Settings > Account Settings, select your account, click **Repair**, and follow the steps.
3. If that fails, create a new profile: Control Panel > Mail > Show Profiles > Add, set up your account, and choose **Always use this profile** for the new one.
4. Check that your mailbox is not full (see the mailbox full guide).

## When to escalate

Escalate if webmail also cannot send or receive, if a specific sender's emails never arrive (they may be blocked as spam), or if you receive "undeliverable" bounce messages. Attach a screenshot of the error or bounce message.
