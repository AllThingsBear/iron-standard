# Security policy

## Supported versions

Only the latest release on `main` is supported while the project is in pre-release (0.x).

## Threat model

IRON STANDARD is a single-user app meant to run on your own computer.

- It binds to `127.0.0.1` by default and has **no authentication or TLS**. Anyone who can reach the port can read and change your data. Do not expose it to a LAN or the internet without your own authentication and TLS in front of it.
- It makes no network requests of its own: no telemetry, analytics or update checks.
- Your data (including health notes) is stored unencrypted in a local SQLite file under `data/`. Protect it with your operating system's disk encryption and file permissions.
- Trainer reports contain your goals, limitations and workout notes. They are written to `data/reports/` and shown on screen; sharing them is your decision.

## Reporting a vulnerability

Please report security issues privately using GitHub's **"Report a vulnerability"** (Security tab → Advisories) on this repository rather than opening a public issue. Include steps to reproduce and the version. We aim to acknowledge reports within a week.

Please do not include real health data, databases or reports in a report.
