---
title: VPN will not connect or keeps disconnecting
category: Network
---

# VPN will not connect or keeps disconnecting

Use this guide when the VPN client cannot connect from home or another remote location, times out, shows "gateway not reachable", or drops the connection after a few minutes.

## Before you start

- Make sure your internet connection works without the VPN: open any public website.
- The VPN only works with your current network password. If you changed your password recently, use the new one.
- Hotel, airport and some public Wi-Fi networks block VPN traffic. Try a mobile hotspot to rule this out.

## Fix a VPN that will not connect

1. Fully quit the VPN client (right-click the tray icon and choose Exit), then open it again.
2. Check the portal or gateway address in the client settings. It must be exactly `vpn.helpdesk.local` with no extra spaces.
3. Sign in with your full username (for example `firstname.lastname`) and your current password, then approve the MFA prompt on your phone within 60 seconds.
4. Restart your home router if other devices are also slow or offline.
5. Turn off any third-party firewall or other VPN app (for example a personal VPN) and try again.
6. Restart the computer. This clears stuck network adapters and pending updates.
7. If the client reports that it is out of date, install the latest version from the Software Center, then restart.

## Fix a VPN that keeps disconnecting

1. Connect your laptop with a network cable or move closer to the Wi-Fi router; weak Wi-Fi signal is the most common cause of drops.
2. In Power settings, set "When plugged in, put the computer to sleep" to Never while working remotely, and disable "Allow the computer to turn off this device to save power" for the Wi-Fi adapter in Device Manager.
3. Avoid connecting through another VPN or a proxy at the same time.
4. Update Windows and restart.

## When to escalate

Raise or escalate a ticket if the client shows "authentication failed" with a correct password, if the error mentions a certificate, or if the VPN still fails on two different internet connections. Include the exact error message and the time it happened.
