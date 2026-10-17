---
title: Windows updates failing or stuck
category: Software
---

# Windows updates failing or stuck

Use this guide when Windows Update shows an error code, an update keeps failing to install, or the computer is stuck at "Working on updates" or "Undoing changes".

## Update fails with an error

1. Restart the computer and run Windows Update again (Settings > Windows Update > Check for updates). Many failures succeed on the second try.
2. Make sure there is at least 20 GB of free space on the C: drive.
3. Run the troubleshooter: Settings > System > Troubleshoot > Other troubleshooters > **Windows Update** > Run.
4. Open Command Prompt as administrator (if you have rights) and run `sfc /scannow`, then `DISM /Online /Cleanup-Image /RestoreHealth`, then restart.
5. Keep the laptop plugged in and connected to the network during updates.

## Stuck at "Working on updates"

1. Wait at least 60 minutes; large updates can be slow, especially on older computers.
2. If the progress has not changed for over 2 hours, hold the power button for 10 seconds to turn the computer off, then turn it on again.
3. Windows usually rolls back the update automatically ("Undoing changes"). Let it finish.

## Pause updates during exams or presentations

You can pause updates for up to one week in Settings > Windows Update > **Pause updates**. Security updates must be installed within 14 days of release.

## When to escalate

Escalate with the error code (for example `0x80070002`) if the same update fails three times, or if the computer restarts into a loop of "Undoing changes".
