---
title: Cloud CLI says credentials are missing or expired
category: Account/Access
---

# Cloud CLI says credentials are missing or expired

Use this guide when a command-line tool or SDK for AWS, Azure or Google Cloud fails with "Unable to locate credentials", "The security token included in the request is expired", "ExpiredToken", "Token has expired and refresh failed", "Please run 'az login'", or "Reauthentication is needed".

## AWS CLI

1. Company accounts use single sign-on. Run `aws configure sso` once to set up a profile, choosing the account and role you need.
2. When the session expires (usually after 8 to 12 hours), run `aws sso login --profile <profile name>`.
3. Pass the profile with `--profile <profile name>`, or set the `AWS_PROFILE` environment variable.
4. Check who you are signed in as with `aws sts get-caller-identity`.
5. Old `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` or `AWS_SESSION_TOKEN` environment variables override your profile. Remove them and open a new terminal.

## Azure CLI

1. Run `az login` and sign in with your work account in the browser window.
2. If you have several subscriptions, check the active one with `az account show` and change it with `az account set --subscription "<name or id>"`.
3. If the login keeps failing, clear the cached sign-in with `az logout`, then run `az login` again.

## Google Cloud CLI

1. Run `gcloud auth login` to sign in the CLI itself.
2. Applications and SDKs need a separate sign-in: `gcloud auth application-default login`.
3. Check the active account and project with `gcloud config list`, and change the project with `gcloud config set project <project id>`.

## Still failing

1. Check the computer clock is correct and set automatically; signed requests fail when the clock is wrong.
2. On the office network, the CLI may need the company proxy settings (see the package install and proxy guide).
3. Update the CLI to the latest version from the Software Center.

## When to escalate

Raise a ticket if you have no SSO profile or role for the account you need, or if a long-term access key may have been exposed. Never paste access keys or tokens into a ticket, chat or code repository.
