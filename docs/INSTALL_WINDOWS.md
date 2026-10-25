# Installing IRON STANDARD on Windows

The Windows installer is the easiest way to run IRON STANDARD: no Node.js, Docker or terminal needed. It installs for **your user only** (no administrator rights), adds a Start menu shortcut, and opens like a normal desktop program. Everything still runs locally and offline; the app has no accounts and no cloud.

> The installer is attached to GitHub Releases for versions that include it. Until then, use the developer install or Docker described in the [README](../README.md).

## Install

1. Download `IRON-STANDARD-Setup-<version>.exe` from the [Releases page](https://github.com/AllThingsBear/iron-standard/releases).
2. (Recommended) Check the download against `SHA256SUMS.txt` from the same release. In PowerShell:
   ```powershell
   Get-FileHash .\IRON-STANDARD-Setup-<version>.exe -Algorithm SHA256
   ```
   The hash must match the line in `SHA256SUMS.txt`.
3. Double-click the installer and follow the prompts. You can change the install folder.
4. Start **IRON STANDARD** from the Start menu or desktop shortcut. The first launch shows a short setup screen (everything on it is optional).

### "Windows protected your PC" (SmartScreen)

The installer is **not code-signed yet** (signing certificates cost money and we have no commercial publisher), so Windows shows an "Unknown publisher" warning. This is expected for new open-source apps. To continue, click **More info → Run anyway**, after checking the checksum in step 2. Every release is built by GitHub Actions from the public source code, and the same workflow installs it on a clean Windows machine and tests it before it is attached to the release. We plan to look into free code signing for open-source projects.

## Where your data lives

Your data is **never** stored in the install folder, so updating or reinstalling cannot erase it.

| What | Where |
|---|---|
| Database (workouts, notes, profile) | `%APPDATA%\IRON STANDARD\data\iron-standard.db` |
| Backups and trainer reports | `%APPDATA%\IRON STANDARD\data\backups` and `...\reports` |
| Saved AI key (if you add one) | `%APPDATA%\IRON STANDARD\data\ai.json` |
| Server log (for troubleshooting) | `%APPDATA%\IRON STANDARD\logs\server.log` |

`%APPDATA%` is usually `C:\Users\<you>\AppData\Roaming`. Inside the app, the **DATA** tab shows these locations, and **File → Open data folder** opens the folder.

## Update

Run the newer installer. It replaces the old program files and keeps your data. (Only the same install folder is updated; if you chose a custom folder before, choose it again.)

## Uninstall

**Settings → Apps → IRON STANDARD → Uninstall.** This removes the program and shortcuts but **keeps your data folder** so a reinstall picks up where you left off. To delete your data too, remove `%APPDATA%\IRON STANDARD` yourself afterwards (export or back up first if you might want it).

## Moving to a new computer

On the old computer open the **DATA** tab and download a full export. Install IRON STANDARD on the new one, open **DATA → Import**, and choose **Replace everything**.

## How it works (for the curious)

The installer contains a small Electron window and a copy of the same web app you can run from source, plus the Node.js runtime it was tested with. The window starts the app's server on `127.0.0.1` (only your computer can reach it, normally on port 4871, or another free port if that one is taken), shows it, and shuts it down when you close the window. The app is not reachable from other computers, and it makes no network requests unless you use the optional AI trainer.

## Troubleshooting

- **The window never appears or says the server did not start:** open the log at `%APPDATA%\IRON STANDARD\logs\server.log` (File → Open log folder) and include its last lines in an issue. Do not post your database.
- **Antivirus quarantines the installer:** unsigned programs are sometimes flagged. Verify the checksum, and report false positives to your antivirus vendor.
- **Port in use:** the app automatically picks another free port.
- **Two copies of the app:** only one window can run at a time; launching again just focuses the existing window.

## Building the installer yourself

Requires Windows, Node.js 22 and `npm ci`:

```bash
npm run desktop:build        # app bundle + installer in ./release
npm run desktop:smoke        # launch test of the unpacked app (after: npm run desktop:dir)
```

The build bundles the Node.js that runs the build, so use Node 22 (the version CI uses) for release builds.
