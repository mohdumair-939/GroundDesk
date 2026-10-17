---
title: Cannot open shared network drive or folder
category: Network
---

# Cannot open shared network drive or folder

Use this guide when a mapped drive (such as `S:` or `H:`) shows a red X, says "network path not found", or you get "access denied" when opening a shared folder.

## Drive shows a red X or "network path not found"

1. Shared drives only work on the internal network. If you are working remotely, connect to the VPN first.
2. Open File Explorer and double-click the drive. Windows often reconnects it after a few seconds.
3. Check the path by typing it directly in the File Explorer address bar, for example `\\fileserver\departments`.
4. Reconnect the drive: right-click **This PC** > **Map network drive**, choose the letter, enter the path, tick **Reconnect at sign-in**, and finish.
5. Restart the computer after reconnecting the VPN.

## "Access denied" or "You do not have permission"

1. Check that you are signed in with your own account, not a shared or local account.
2. Access to department folders is granted by group membership. If you are new or changed teams, your manager must approve access.
3. Raise a ticket naming the exact folder path and the access you need (read only, or read and write), and include your manager's approval.
4. Group membership changes can take up to one hour and need you to sign out and back in.

## Files are slow to open

1. Copy large files to your computer, work on them locally, then copy them back.
2. Avoid opening the same file from many places at once; it may be locked by another user.

## When to escalate

Escalate if the path does not open for anyone in your team, or if you still get "access denied" one hour after your access was approved.
