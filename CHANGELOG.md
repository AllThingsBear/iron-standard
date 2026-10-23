# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/) (0.x = pre-release).

## [Unreleased]

### Added
- Program editor (new PROGRAM tab): weekly schedule, sessions, exercises, reordering, duplicate/delete, reset to starter
- Built-in exercise library (30 generic exercises) filtered by the equipment in your profile
- Server-side program validation (id uniqueness, length and range limits); rejected saves change nothing
- DATA tab: full JSON export, sets CSV export, validated import (merge or replace), one-click SQLite backups with download and restore, and a view of where your files are stored. Imports and restores take an automatic safety backup first; the newest 30 backups are kept
- Original stick-figure illustrations (start/finish poses with the working muscles highlighted) for 24 common exercises, matched by exercise name, so custom exercises pick them up too
- Trainer reports now include logged exercises that were later removed from the program

## [0.1.0] - 2026-10-20

First public pre-release.

### Added
- Weekly schedule, daily checklist and exercise instructions
- Per-set logging with weight, reps, 0–10 pain score and notes
- Daily metrics: weight, waist, calories, protein, walking
- Local profile and first-run onboarding (imperial/metric, goals, targets, equipment, limitations, starter or empty program)
- After-action report, session confirmation and trainer-report export
- Trainer's Notes: append-only, clearly labelled AI feedback per workout, included in later reports
- Docker Compose setup (localhost-only, persistent volume)
- `?date=YYYY-MM-DD` deep link to open a specific day
- End-to-end smoke test and GitHub Actions CI (Linux + Windows, Docker build)
- User guide, troubleshooting guide, security policy, contributing guide

### Notes
- Default port is **4871**; the server binds to `127.0.0.1` only.
- No Windows installer, program editor, or data export/import yet (see roadmap in the README).
