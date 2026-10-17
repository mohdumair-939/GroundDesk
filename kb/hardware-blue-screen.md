---
title: Blue screen (BSOD) or unexpected restarts
category: Hardware
---

# Blue screen (BSOD) or unexpected restarts

Use this guide when the computer shows a blue screen with "Your device ran into a problem and needs to restart", or restarts on its own without warning.

## Record the error

1. Write down or photograph the **stop code** on the blue screen (for example `IRQL_NOT_LESS_OR_EQUAL`, `MEMORY_MANAGEMENT` or `CRITICAL_PROCESS_DIED`) and the time it happened.
2. Note what you were doing (starting up, plugging in a device, running a particular program).

## After a single blue screen

1. Let the computer restart. A single blue screen can be a one-off event.
2. Save your work often until you know it is stable.
3. Install all Windows updates and restart.

## Repeated blue screens

1. Unplug all external devices (docking station, USB drives, printers, extra monitors) and see whether the problem stops. Reconnect them one at a time to find a faulty device or driver.
2. Update drivers using Windows Update > Advanced options > **Optional updates** > Driver updates.
3. If the problem started after installing a program or driver, uninstall it, or use **System Restore** to go back to an earlier restore point.
4. Run **Windows Memory Diagnostic** (search for it in the Start menu) and restart to test the memory.
5. Open Command Prompt as administrator (if you have rights) and run `sfc /scannow` to repair system files.

## Cannot start Windows

If the computer blue-screens before you can sign in, Windows usually opens **Automatic Repair** after two or three failed starts. Choose Advanced options > **Startup Repair**. If that fails, raise a ticket.

## When to escalate

Escalate with the stop code if blue screens happen more than once in a week, if the memory test reports errors, or if the computer cannot start Windows. Back up your files to OneDrive first if you can.
