# User guide

## First run

The first time you open IRON STANDARD you get a short setup screen. **Everything is optional and skippable.**

- **Units:** imperial (lb / in) or metric (kg / cm).
- **Weights and targets:** starting weight, goal weight, calorie and protein targets. The goal can be a loss, a gain or maintenance; progress is measured toward whichever you set.
- **Equipment, limitations, preferences:** free text that is used only when you build a trainer report.
- **Starting program:** a neutral starter (three full-body days with walks between) or an empty program.

You can change all of this later on the **PROFILE** tab.

## Daily mission

The **Daily Mission** tab shows the session scheduled for the selected date. Use the arrows, the date picker or the week strip to move around.

1. Read the exercise description and any caution note. Click the small illustration to enlarge it. Each exercise also shows **what it works** (muscle chips) and **why it helps**, in plain English.
2. Tick the checkbox when an exercise is done, **or** click **LOG SET** and record each set.
3. Each exercise shows a **suggested weight** (see Suggested weights below). Log each set **right after you finish it**, so pain and notes are recorded where they actually happened: enter weight, reps, a **pain score (0–10, defaults to 0)** and optional **notes** (how it felt, form, pain location and when it started, tingling, anything you want to remember). Your entries are **autosaved** about a second after you stop typing (the card shows "Autosave · saved"), and the exercise is marked complete automatically once every planned set has reps. **Save & mark done** checks it off immediately.
4. Add daily metrics (weight, waist, calories, protein, walking) in **Daily Intel**.
5. When you finish, write a general note in the **After-Action Report** and click **Confirm workout**.

Pain scores matter: a trainer (human or AI) can only spot a trend if you record a number each time. 0 means none; 4 or higher is a stop-and-adjust signal.

## Suggested weights

Every exercise shows a recommended weight (a chip next to its sets and reps, and a box when you open **Log set**). A **Fill** button copies it into the empty weight boxes.

- **Suggested** comes from your own history, using simple, conservative rules. It only ever changes the **weight**, never your sets or volume. It adds one small step (5 lb / 2.5 kg) only when every set hit the top of the rep range with pain at 0–1. It holds the weight if pain was 2–3, if pain wasn't recorded, or if your notes mention pain. It drops about 20% if pain reached 4 or more. Timed exercises build duration first, and bodyweight exercises get a rep or tempo target. With no history it asks you to start light.
- **Trainer pick** is a weight your trainer (human or AI) set for that exercise, with a short reason. It wins over the automatic suggestion until you log a newer session of that exercise.
- Suggestions are guidance, not medical advice. You decide the weight.

## Editing your program

Open the **PROGRAM** tab to build your own week.

- **Weekly schedule:** pick which session runs on each weekday (use a rest/open session for off days).
- **Sessions:** create, duplicate or delete sessions and edit their title, subtitle and description.
- **Exercises:** edit name, sets, reps or time, category, form instructions, an optional safety note, the equipment needed, and (optionally) what it works and why it helps. Leave those two blank and the app fills them in from the exercise name. Reorder with the arrows. Add a blank exercise or pick one from the built-in library (tick "only my equipment" to hide things you cannot do).
- **Log fields:** each exercise only asks for what makes sense. Walks log minutes; push-ups, bridges, dead bugs and bird dogs log reps only (no weight); planks log seconds; carries log weight and seconds; lifts log weight and reps. This is picked automatically from the name, reps and equipment, and you can override it per exercise with **LOG FIELDS**. If an old entry has a weight on a no-weight exercise, it stays visible in an "OLD" column so you can correct it.
- **Optional bonus:** tick **OPTIONAL BONUS** on an exercise for extra work you may skip. It is marked on the day, does not count toward finishing the session, and the trainer report tells the AI it was optional.
- **Save:** changes only apply when you press **Save program**. **Discard** throws away unsaved edits. **Reset to starter** replaces everything with the neutral starter program (it asks first).

Good to know: logged sets and notes are never deleted by editing. If you remove an exercise, its old logs stay in your database and still appear in trainer reports (marked "not in the current program"). Days show the session currently scheduled for that weekday, so changing the schedule changes how past dates are displayed.

## Progress

The **Field Reports** tab lists every logged date. Click a row to open that day. The top of the dashboard shows starting weight, last logged weight and how far you are toward your goal.

## Send to trainer

After you confirm a workout, **Send to trainer** builds a self-contained Markdown report containing your goals, equipment, limitations, safety rules, the workout you just did, your recent metrics and your last eight sessions. It is saved to `data/reports/` and shown on screen with a **Copy** button.

- Nothing is sent anywhere automatically. You decide where to paste it (any AI assistant, or a human coach).
- Paste the reply into **Trainer's Notes → Add feedback**. Feedback is labelled **AI-GENERATED**, is append-only, and never changes your workout history, goals or program.
- Previous feedback is included in later reports so the trainer can see its own earlier advice.

## AI trainer (optional)

You never need AI. You can always copy a report to any assistant and paste the reply into Trainer's Notes. If you want one-click replies, set up a provider in **PROFILE → AI trainer**:

- **Claude CLI:** uses the Claude Code command-line tool already installed and signed in on your computer. No API key.
- **Anthropic API** or **OpenAI-compatible** (OpenAI, OpenRouter, or a local server such as Ollama or LM Studio): enter a model and a key (local servers need none). The provider bills you directly under its own terms; IRON STANDARD has no AI service or credits of its own.

Then confirm a workout and click **Ask AI trainer**. You are asked to confirm each time, because the report (goals, limitations, workouts, notes, metrics) is sent to that provider. The reply is saved as an **AI-generated**, append-only note. It may also **propose** weight picks: they appear in a panel and only take effect if you click **Apply picks**. Your logged history, goals and program are never changed by the AI. Use **Test connection** to check a provider with a harmless message that contains none of your data.

Step-by-step instructions for every option, including a free private local model with Ollama, are in the **[AI trainer setup guide](AI_SETUP.md)**.

Your API key is kept only on this computer (`data/ai.json`), is never shown again, and is never included in exports or backups.

## Backing up, exporting and moving your data

The **DATA** tab shows exactly where your files are and has everything you need:

- **Download full export (.json):** a complete copy of your profile, program, workouts, sets, metrics and trainer notes. Keep one somewhere safe, or use it to move to another computer.
- **Sets as spreadsheet (.csv):** every set you have logged, for Excel or Google Sheets. This is a one-way export for analysis.
- **Import:** choose an export file, check the summary, then pick a mode.
  - **Merge** adds the file's records to what you have (records for the same date and exercise are overwritten by the file; nothing else is touched; your profile and program are left alone).
  - **Replace everything** swaps all your data, including profile and program, for the file's contents.
  - A bad or incompatible file is rejected before anything changes, and a safety backup is always taken first.
- **Back up now:** saves a snapshot of the whole database to `data/backups/`. Download any backup, or **Restore** one (this replaces current data, after taking a safety backup of it). The newest 30 backups are kept.

To move to another computer: export on the old one, install IRON STANDARD on the new one, and import the file (choose Replace).

## Your data

All data lives in `data/iron-standard.db` (SQLite). Stop the app and copy the file (and `-wal` / `-shm` if present) to back it up. See the README for Docker backup and restore.
