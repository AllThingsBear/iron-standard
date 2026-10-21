# IRON STANDARD

A free, open-source, **local-first** fitness tracker with a tactical matte-black / FDE / olive look.
No accounts. No cloud. No telemetry. Your workouts, measurements and notes live in a SQLite database on your own computer.

> **Status: v0.1.0 pre-release.** Core tracking works. A Windows installer, an exercise library and program editor, data export/import and optional AI-trainer integrations are on the roadmap below. Expect rough edges.

## Features

- Weekly workout schedule with a daily checklist and exercise instructions
- Per-set logging: weight, reps, 0–10 pain score and a note for every set
- Daily metrics: weight, waist, calories, protein, walking minutes, notes
- First-run setup: imperial or metric, optional goals and targets, equipment, physical limitations, starter or empty program (everything optional, skippable)
- After-action report and an optional "send to trainer" export: a self-contained text report you can paste into any AI assistant (or read yourself)
- Works fully offline; nothing leaves your machine unless you copy it out yourself

## Run it (developer install)

Requires Node.js 20+ (22 recommended).

```bash
npm install
npm run dev        # http://localhost:4871, bound to 127.0.0.1 only
```

IRON STANDARD uses port **4871** (an uncommon port, to avoid clashing with other local apps). To use another one: `npm run dev -- -p 5000`.

Production build:

```bash
npm run build
npm start
```

Your data is stored in `./data/iron-standard.db` (override with the `DB_PATH` environment variable).

## Run it with Docker

```bash
docker compose up --build -d
```

Open http://localhost:4871. The container is published on `127.0.0.1` only (change the host port on the left of `4871:3000` in `docker-compose.yml` if it clashes), and data persists in the `iron_standard_data` volume. Stop with `docker compose down` (do **not** add `-v` unless you intend to delete your data).

> The native install and the Docker install use different databases.

## Your data

Everything is in one SQLite file. To back it up, copy `data/iron-standard.db` (and its `-wal`/`-shm` files if present) while the app is stopped. Trainer reports are saved as Markdown in `data/reports/`. The `data/` folder is git-ignored.

## Roadmap

- [x] Local profile and goals (no hardcoded personal data)
- [x] Per-set logging, pain tracking, session notes, trainer report export
- [ ] Trainer feedback saved back onto each workout
- [ ] Exercise library and program editor
- [ ] Data export / import and in-app backup
- [ ] Windows installer (Electron) — for now, run it from source in your browser (see above)
- [ ] Optional AI integrations (local Claude CLI, bring-your-own API key)

## Disclaimer

IRON STANDARD is a self-managed training journal. It is **not medical advice** and does not diagnose, treat or prevent anything. Talk to a qualified clinician before starting or changing an exercise or nutrition program, and stop for sharp pain, numbness, tingling or weakness. Calorie and protein figures are whatever you enter. Any AI-generated feedback is not a substitute for a professional.

IRON STANDARD is an independent project. It is **not affiliated with or endorsed by any military, veterans' or government organization**. The flag artwork is original, simple vector art drawn for this project.

## Privacy and security

No analytics, advertising or tracking. The server binds to localhost by default and has **no authentication**, so do not expose it to a network without adding your own protection (reverse proxy with auth and TLS).

## License

MIT. See [LICENSE](LICENSE).
