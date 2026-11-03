---
title: Cannot connect to a cloud server with SSH or Remote Desktop
category: Network
---

# Cannot connect to a cloud server with SSH or Remote Desktop

Use this guide when you cannot reach a virtual machine in AWS, Azure or Google Cloud with SSH or Remote Desktop (RDP), and the connection times out, is refused, or fails with "Permission denied (publickey)" or "UNPROTECTED PRIVATE KEY FILE".

## Connection times out

1. Check that the server is running in the cloud console. A stopped server cannot be reached, and its public IP address may change after it starts again.
2. Use the current address shown in the console. Internal (private) addresses only work over the VPN or from inside the same network.
3. Connect to the VPN if the server only accepts connections from the company network.
4. The server's firewall rules (AWS security group, Azure network security group or Google Cloud firewall rule) must allow your port: 22 for SSH, 3389 for Remote Desktop. Rules often only allow the office or VPN address range.
5. Guest Wi-Fi and some home routers block port 22. Try another network or use the cloud provider's browser-based connection (AWS Systems Manager Session Manager, Azure Bastion or Google Cloud's SSH-in-browser) if your team uses it.

## Connection refused

The server answered but nothing is listening. The SSH or Remote Desktop service may be stopped, or the server may still be starting. Wait two minutes and try again, then check the serial console or boot log in the cloud console.

## SSH: Permission denied (publickey)

1. Use the right user name for the image, for example `ec2-user`, `ubuntu` or `azureuser`.
2. Point SSH to the right key: `ssh -i path/to/key.pem user@address`.
3. On macOS or Linux, private keys must be readable only by you: `chmod 600 key.pem`. On Windows, remove other users from the file's **Security** permissions.
4. Your public key must be added to the server; ask the server owner.

## Remote Desktop: credentials do not work

Use the local or domain account set up for that server, not your normal email address, and include the domain if needed (for example `DOMAIN\username`).

## When to escalate

Raise a ticket with the server name or ID, cloud provider, account or subscription, the address you used, your network (office, VPN or home) and the exact error. Do not open firewall rules to the whole internet as a workaround.
