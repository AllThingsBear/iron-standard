# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/) (0.x = pre-release).

## [Unreleased]

## [0.2.0] - 2026-10-24

Second pre-release: the first with a Windows installer, plus everything built since v0.1.0.

### Added
- Program editor (new PROGRAM tab): weekly schedule, sessions, exercises, reordering, duplicate/delete, reset to starter
- Built-in exercise library (30 generic exercises) filtered by the equipment in your profile
- Server-side program validation (id uniqueness, length and range limits); rejected saves change nothing
- Windows installer (Electron + the same tested server with a bundled Node runtime): per-user install without admin rights, Start menu and desktop shortcuts, data kept in %APPDATA%, upgrade-in-place, clean uninstall that keeps your data. Built and tested on a clean Windows runner by GitHub Actions (install, launch, uninstall). Unsigned for now
- Guided local-AI setup (PROFILE -> AI trainer -> OLLAMA (LOCAL)): four steps with hardware detection (NVIDIA graphics memory, RAM, free disk) and a model recommendation, an install check that points to Ollama's official download, a streamed model download with progress and cancel, one-click connect and test, and turn-off / delete-model buttons. Only models from a short verified list can be downloaded
- OLLAMA (LOCAL) option: detects Ollama, lists installed models and, with one click, creates an app-scoped model with a 16K context window (no environment variables); new step-by-step AI setup guide (docs/AI_SETUP.md)
- Optional AI trainer (PROFILE → AI trainer): Claude CLI, Anthropic API or any OpenAI-compatible service (including local Ollama). One-click "Ask AI trainer" with a confirmation each time; replies saved as AI-labelled notes; proposed weight picks need your approval. Keys are write-only and excluded from exports/backups
- Works with reasoning models (e.g. Gemma 4 via Ollama): larger token budget, clear error if the model runs out of tokens while thinking, and docs for Ollama's context window. Tested with gemma4:12b on a 16 GB GPU
- Request guard on every API route (loopback Host only; same-origin JSON for writes) to block CSRF and DNS rebinding
- Security hardening: PostCSS override (npm audit clean), least-privilege CI, Dependabot
- Click any exercise illustration to enlarge it (Esc or click outside to close); figures are now auto-fitted to their frame so nothing is cut off; fixed the glute bridge and floor press leg poses
- Every exercise shows what it works and why it helps (muscle chips and a plain-English benefit), filled in automatically from the exercise name and editable in the program editor; also included in trainer reports
- Recommended weights on every exercise: conservative automatic progression from your history (never progresses on unrecorded or reported pain) plus trainer picks that override it until a newer session is logged
- Pain score now defaults to 0 for new sets; set notes are general notes (how it felt, form, pain, anything)
- DATA tab: full JSON export, sets CSV export, validated import (merge or replace), one-click SQLite backups with download and restore, and a view of where your files are stored. Imports and restores take an automatic safety backup first; the newest 30 backups are kept
- Original stick-figure illustrations (start/finish poses with the working muscles highlighted) for 24 common exercises, matched by exercise name, so custom exercises pick them up too
- Trainer reports now include logged exercises that were later removed from the program

### Known limitations
- The Windows installer is unsigned (SmartScreen shows "Unknown publisher"); verify the checksum in `SHA256SUMS.txt`
- Windows x64 only; no macOS/Linux installer, no auto-update (by design: no network calls)
- Local-AI hardware detection is reliable for NVIDIA cards only; AMD, Intel and Apple Silicon are untested

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
