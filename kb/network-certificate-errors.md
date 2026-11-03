---
title: Certificate errors or "Your connection is not private"
category: Network
---

# Certificate errors or "Your connection is not private"

Use this guide when a browser shows "Your connection is not private", "NET::ERR_CERT_DATE_INVALID", "NET::ERR_CERT_AUTHORITY_INVALID", or a tool such as Git, Python, npm or curl fails with "SSL certificate problem", "unable to get local issuer certificate" or "CERTIFICATE_VERIFY_FAILED".

## In the browser

1. Check the computer date, time and time zone. Settings > **Time & language** > set time and time zone **automatically**, then click **Sync now**. A wrong clock is the most common cause.
2. Hotel, airport and café Wi-Fi often show a sign-in page first. Open `http://neverssl.com` to bring up that page, accept the terms, then try again.
3. Try a different network, for example a mobile hotspot, to see whether the network is the cause.
4. If the error appears on one company site only, report it; its certificate may have expired.
5. Do not click **Proceed anyway** or **Advanced > Continue** for sites where you sign in or enter data.

## In developer tools (Git, Python, npm, curl)

1. The company network inspects encrypted traffic, so tools must trust the company root certificate. Company-managed Windows computers have it installed for browsers, but some tools use their own certificate list.
2. Connect to the VPN or office network, then update the tool to the latest version from the Software Center.
3. Point the tool at the system or company certificate. For Git on Windows, run `git config --global http.sslBackend schannel`. For Python and pip, install the `pip-system-certs` package, or ask for the company certificate bundle and set `REQUESTS_CA_BUNDLE`. For npm and Node.js, set `NODE_EXTRA_CA_CERTS` to the company certificate file.
4. Never turn off certificate checks (for example `sslVerify false`, `--trusted-host` or `strict-ssl false`) as a permanent fix.

## When to escalate

Raise a ticket with a screenshot of the error, the full address of the site or the command you ran, and the network you were on. Escalate straight away if a well-known site such as your bank or Microsoft 365 shows a certificate error, because the network may be unsafe.
