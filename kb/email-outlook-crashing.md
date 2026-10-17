---
title: Outlook crashes, freezes, or will not open
category: Email
---

# Outlook crashes, freezes, or will not open

Use this guide when Outlook closes unexpectedly, shows "Outlook has stopped working", hangs on "Loading profile" or "Processing", or will not start at all.

## Start in safe mode

1. Close Outlook. Press Windows + R, type `outlook.exe /safe` and press Enter.
2. If Outlook works in safe mode, an add-in is the cause. Go to File > Options > Add-ins, choose **COM Add-ins** > **Go**, untick all add-ins, then restart Outlook normally.
3. Turn add-ins back on one at a time to find the faulty one, and leave it disabled.

## Stuck on "Loading profile"

1. Open Task Manager and end any `OUTLOOK.EXE` process still running.
2. Restart the computer.
3. If it still hangs, create a new Outlook profile: Control Panel > Mail > Show Profiles > Add.

## Repair Office

1. Open Settings > Apps > Installed apps, find **Microsoft 365** (or Microsoft Office), choose **Modify**.
2. Run **Quick Repair** first. If the problem continues, run **Online Repair** (needs internet, takes longer).
3. Restart the computer after the repair.

## Keep Outlook healthy

- Install Office updates: File > Office Account > Update Options > Update Now.
- Keep the mailbox under its quota.
- Avoid very large local PST files; ask IT to move old PST files to your online archive.

## When to escalate

Escalate if Outlook still crashes after safe mode, a new profile, and an Online Repair. Include the time of the crash and any error message.
