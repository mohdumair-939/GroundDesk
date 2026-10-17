---
title: Cannot connect to campus or office Wi-Fi
category: Network
---

# Cannot connect to campus or office Wi-Fi

Use this guide when a laptop or phone cannot join the `Campus-Secure` Wi-Fi network, shows "Can't connect to this network", connects with "No internet", or the Wi-Fi icon is missing.

## Quick checks

1. Make sure Wi-Fi is turned on and Airplane mode is off (Windows: Settings > Network & internet).
2. Check whether other people nearby can connect. If nobody can, it is an outage: raise a ticket with the building and room number.
3. Move closer to an access point. Thick walls and lifts block the signal.

## Reconnect to Campus-Secure

1. Open Settings > Network & internet > Wi-Fi > Manage known networks.
2. Select `Campus-Secure` and choose **Forget**.
3. Reconnect to `Campus-Secure` and sign in with your full username and current network password.
4. If asked to trust a certificate from `radius.helpdesk.local`, choose **Connect**. Do not accept certificates with any other name.
5. If you recently changed your password, your phone or laptop may still be trying the old one. Forgetting the network and reconnecting fixes this.

## Connected but "No internet"

1. Turn Wi-Fi off and on again.
2. Open Command Prompt and run `ipconfig /release` and then `ipconfig /renew`.
3. Run `ipconfig /flushdns`.
4. Restart the computer.

## Wi-Fi option missing

1. Open Device Manager > Network adapters and check that the wireless adapter is present and not disabled.
2. Right-click the adapter and choose **Enable device** if it is disabled.
3. Use Settings > Network & internet > Advanced network settings > **Network reset**, then restart.

## Guest access

Visitors should use the `Campus-Guest` network and register with an email address on the sign-in page. Guest access lasts 24 hours.

## When to escalate

Escalate if the adapter shows an error in Device Manager, if the network is visible but authentication always fails with the correct password, or if a whole room or floor has no Wi-Fi.
