# Security policy

## Supported versions

Only the latest release on `main` is supported while the project is in pre-release (0.x).

## Threat model

IRON STANDARD is a single-user app meant to run on your own computer.

- It binds to `127.0.0.1` by default and has **no login or TLS**. Anyone who can reach the port can read and change your data. Do not expose it to a LAN or the internet without your own authentication and TLS in front of it.
- **Request guard.** Because there is no login, every `/api` request is checked: the `Host` must be a loopback name (`localhost`, `127.0.0.1`, `[::1]`) and every state-changing request must be same-origin `application/json`. This blocks other websites you visit from reading or changing your data through your browser (CSRF) and DNS-rebinding tricks. If you deliberately serve it behind a reverse proxy under another hostname, list it in the `ALLOWED_HOSTS` environment variable (comma-separated) and add authentication in the proxy.
- **No telemetry.** It makes no network requests of its own: no analytics, update checks or tracking. The only outbound request is the optional AI trainer, and only when you click **Ask AI trainer** and confirm.
- **Your data is not encrypted at rest.** Health notes live in a plain SQLite file under `data/`. Protect it with your operating system's disk encryption and file permissions.
- **AI keys.** An API key you enter is stored only in `data/ai.json` on this computer (or read from the `AI_API_KEY` environment variable). It is never returned to the browser, never included in exports or database backups, and git-ignored. If you share a copy of your `data/` folder, remove `ai.json` first.
- **What the AI receives.** A trainer report: your goals, limitations, workout and set notes, and recent metrics. Choose a provider you trust (a local model such as Ollama keeps everything on your machine).
- Trainer reports and backups are written to `data/reports/` and `data/backups/`; sharing them is your decision.

## The Windows installer

- It is **not code-signed yet**, so Windows SmartScreen shows an "Unknown publisher" warning. Verify the SHA-256 checksum published with each release (`SHA256SUMS.txt`) before running it.
- Release installers are built by the public GitHub Actions workflow from the tagged source and tested on a clean Windows runner. There is no auto-updater and no telemetry: you update by installing a newer version.
- The desktop window only loads the local app (`127.0.0.1`); any other link opens in your normal browser. The Electron window runs with context isolation and the sandbox enabled and no Node.js access.

## Reporting a vulnerability

Please report security issues privately using GitHub's **Report a vulnerability** (Security tab, then Advisories) on this repository rather than opening a public issue. Include the version and steps to reproduce. We aim to acknowledge reports within a week.

Please do not include real health data, databases or reports in a report.

## For contributors and forks

- Never commit `data/`, databases, backups, reports, `ai.json`, `.env*` files or keys. These are git-ignored; GitHub secret scanning and push protection are enabled on the main repository.
- Dependencies are monitored with Dependabot; CI runs with read-only permissions.
