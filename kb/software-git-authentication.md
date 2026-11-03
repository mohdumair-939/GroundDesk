---
title: Git asks for a password or says authentication failed
category: Software
---

# Git asks for a password or says authentication failed

Use this guide when `git clone`, `git pull` or `git push` keeps asking for a username and password, or fails with "Authentication failed", "Support for password authentication was removed", "Permission denied (publickey)" or "Repository not found".

## Check which address the repository uses

1. In the repository folder, run `git remote -v`.
2. An address starting with `https://` signs in with a personal access token or the Git Credential Manager.
3. An address starting with `git@` signs in with an SSH key.
4. "Repository not found" usually means you do not have access to the repository, or the address has a typo. Open the same address in your browser while signed in to check.

## HTTPS: password rejected

1. Git hosting services no longer accept your account password for Git commands. Use the Git Credential Manager (installed with Git for Windows from the Software Center) or a personal access token.
2. With the Credential Manager, run the command again; a browser window opens so you can sign in with single sign-on and MFA.
3. If you use a token, create a new one in your Git hosting account settings, give it read and write access to repositories, and paste it when Git asks for the password.
4. If an old or expired password is saved, remove it: open **Credential Manager** from the Start menu > **Windows Credentials**, delete the entries for the Git host, then run the command again.
5. For organisation repositories, make sure the token is authorised for single sign-on in the token settings.

## SSH: Permission denied (publickey)

1. Check that you have a key: look for `id_ed25519.pub` in the `.ssh` folder in your user profile.
2. If there is no key, create one with `ssh-keygen -t ed25519 -C "your.name@company.com"` and press Enter to accept the default location.
3. Copy the contents of the `.pub` file (the public key only, never the private key) into the SSH keys page of your Git hosting account.
4. Test the connection with `ssh -T git@<git host>`; it should greet you by username.
5. If the key has a passphrase, start the agent and add the key: `ssh-add ~/.ssh/id_ed25519`.
6. On the office network or VPN, SSH on port 22 can be blocked. Use the HTTPS address instead.

## When to escalate

Raise a ticket if you need access to a repository or organisation, if single sign-on fails for the Git host, or if a token was exposed (for example committed to a repository). Never paste tokens or private keys into a ticket.
