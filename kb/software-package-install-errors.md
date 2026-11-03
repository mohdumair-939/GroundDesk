---
title: pip, npm or Docker cannot download packages
category: Software
---

# pip, npm or Docker cannot download packages

Use this guide when installing developer packages fails, for example `pip install` with "Could not find a version that satisfies the requirement" or "Read timed out", `npm install` with "ETIMEDOUT", "ECONNRESET", "407 Proxy Authentication Required" or "E401", or `docker pull` with "timeout" or "unauthorized".

## Check the network first

1. Check that the internet works in a browser.
2. If you are on the VPN, some public package sites may be routed through the company proxy. Try once with the VPN disconnected to compare (only for public packages).
3. If the error mentions a certificate, see the certificate errors guide.

## Company proxy settings

1. On the company network, tools must use the company proxy. Ask the service desk for the proxy address if your tool cannot detect it.
2. Set it for the terminal session with the `HTTPS_PROXY` and `HTTP_PROXY` environment variables, and list internal addresses in `NO_PROXY`.
3. npm reads its own settings: `npm config set proxy <address>` and `npm config set https-proxy <address>`.
4. Do not put your password in proxy settings or configuration files.

## Packages from the internal registry

1. Internal packages come from the company package registry. Sign in to it first: `npm login --registry <registry address>` for npm, or use the token setup the registry page shows for pip.
2. "E401", "403" or "unauthorized" means the sign-in or token expired. Sign in again.
3. For Docker, run `docker login <registry address>` before pulling internal images.

## pip: no matching version

1. Check the package name spelling and that the version exists.
2. Check your Python version with `python --version`. Many packages do not support very new or very old Python versions yet.
3. Upgrade pip: `python -m pip install --upgrade pip`.
4. Use a virtual environment for each project: `python -m venv .venv`.

## npm: install fails or is slow

1. Delete the `node_modules` folder and run `npm install` again. Run `npm cache verify` if downloads look damaged.
2. Check your Node.js version matches what the project needs (see `.nvmrc` or the `engines` field in `package.json`).

## When to escalate

Raise a ticket with the exact command, the full error text, and whether you were on the office network, VPN or home. Escalate if you need access to the internal registry.
