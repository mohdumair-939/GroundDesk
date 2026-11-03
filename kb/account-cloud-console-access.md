---
title: Access denied in the AWS, Azure or Google Cloud console
category: Account/Access
---

# Access denied in the AWS, Azure or Google Cloud console

Use this guide when you cannot sign in to a cloud console (AWS, Microsoft Azure or Google Cloud), you see "AccessDenied", "You are not authorized to perform this operation", "does not have authorization to perform action", "Permission denied" or "You don't have access to this resource", or a project or subscription you expect is missing.

## Sign in the company way

1. Always sign in through the company single sign-on (SSO) portal, not with a personal or root account.
2. For AWS, open the AWS access portal and choose the account and role you need. For Azure, sign in at `https://portal.azure.com` with your work account. For Google Cloud, sign in at `https://console.cloud.google.com` with your work account.
3. Approve the MFA prompt. If MFA fails, see the MFA guide.

## You are in the wrong place

1. **AWS:** check the account name and role in the top-right menu. Switch role or go back to the access portal to pick the right account. Also check the **Region** selector; resources are listed per region.
2. **Azure:** click your name > **Switch directory** to choose the company directory, then check the **Subscription** filter.
3. **Google Cloud:** use the project picker at the top to select the correct project and organisation.

## Access denied for an action

1. Read the full error message. It names the action (for example `ec2:StartInstances`) and the resource it was denied on.
2. Your role may be read-only. Check whether a different role with more rights is offered to you in the SSO portal.
3. Access granted recently can take up to 15 minutes to apply. Sign out of the console completely, then sign in again.
4. Some actions are blocked on purpose by company policy, for example creating resources outside approved regions.

## Session expired

Console sessions end after a fixed time. If pages suddenly show access errors, sign out, then sign in again through the SSO portal.

## When to escalate

Raise a ticket to request access. Include the cloud provider, the account, subscription or project name, the role or permission you need, the exact error message, and why you need it. Access must be approved by the owner of that account or project. Never share console passwords or access keys with colleagues.
