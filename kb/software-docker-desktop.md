---
title: Docker Desktop will not start or containers fail
category: Software
---

# Docker Desktop will not start or containers fail

Use this guide when Docker Desktop is stuck on "Docker Engine starting", shows "Docker Desktop stopped", "WSL 2 installation is incomplete", "Virtualization support not detected", or commands fail with "Cannot connect to the Docker daemon" or "error during connect".

## Before you start

- Install Docker Desktop from the Software Center; it needs administrator rights and the company licence.
- On Windows, Docker Desktop runs on WSL 2 (Windows Subsystem for Linux).

## Docker Desktop will not start

1. Quit Docker Desktop from the tray icon, then open it again and wait up to two minutes.
2. Restart the computer. This fixes most stuck starts after a Windows update.
3. Update WSL: open PowerShell and run `wsl --update`, then `wsl --shutdown`, and start Docker Desktop again.
4. Check that WSL works with `wsl --status`. If WSL is missing, raise a ticket; turning it on needs administrator rights.
5. Update Docker Desktop to the latest version from the Software Center.
6. As a last step, open Docker Desktop > **Troubleshoot** > **Restart Docker Desktop**. **Reset to factory defaults** deletes all local images and containers.

## "Virtualization support not detected"

Virtualization must be turned on in the computer's firmware (BIOS or UEFI). This needs a technician on company laptops; raise a ticket.

## "Cannot connect to the Docker daemon"

1. Docker Desktop must be running. Start it and wait for the engine to show as running.
2. Run `docker context ls` and make sure the active context is `desktop-linux` (or `default`).

## Containers fail or run out of space

1. A container that stops at once usually has an error in its logs: `docker logs <container name>`.
2. "port is already allocated" means another program uses that port. Stop it, or map another port, for example `-p 8081:80`.
3. Free disk space with `docker system prune`. This removes stopped containers and unused images. Add `--volumes` only if you do not need the data in unused volumes.
4. Increase memory for Docker under **Settings** > **Resources** if builds stop with "killed" or out-of-memory errors.

## When to escalate

Escalate if virtualization or WSL needs to be turned on, if Docker Desktop is not available in the Software Center, or if it still will not start after updating WSL and restarting. Include the error message and the Docker Desktop version.
