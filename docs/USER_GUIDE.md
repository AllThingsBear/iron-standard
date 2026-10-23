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

1. Read the exercise description and any caution note.
2. Tick the checkbox when an exercise is done, **or** click **LOG SET** and record each set.
3. For each set enter weight, reps, an optional **pain score (0–10)** and a note (pain location, form, tingling…). Saving sets also marks the exercise complete.
4. Add daily metrics (weight, waist, calories, protein, walking) in **Daily Intel**.
5. When you finish, write a general note in the **After-Action Report** and click **Confirm workout**.

Pain scores matter: a trainer (human or AI) can only spot a trend if you record a number each time. 0 means none; 4 or higher is a stop-and-adjust signal.

## Editing your program

Open the **PROGRAM** tab to build your own week.

- **Weekly schedule:** pick which session runs on each weekday (use a rest/open session for off days).
- **Sessions:** create, duplicate or delete sessions and edit their title, subtitle and description.
- **Exercises:** edit name, sets, reps or time, category, form instructions, an optional safety note and the equipment needed. Reorder with the arrows. Add a blank exercise or pick one from the built-in library (tick "only my equipment" to hide things you cannot do).
- **Save:** changes only apply when you press **Save program**. **Discard** throws away unsaved edits. **Reset to starter** replaces everything with the neutral starter program (it asks first).

Good to know: logged sets and notes are never deleted by editing. If you remove an exercise, its old logs stay in your database and still appear in trainer reports (marked "not in the current program"). Days show the session currently scheduled for that weekday, so changing the schedule changes how past dates are displayed.

## Progress

The **Field Reports** tab lists every logged date. Click a row to open that day. The top of the dashboard shows starting weight, last logged weight and how far you are toward your goal.

## Send to trainer

After you confirm a workout, **Send to trainer** builds a self-contained Markdown report containing your goals, equipment, limitations, safety rules, the workout you just did, your recent metrics and your last eight sessions. It is saved to `data/reports/` and shown on screen with a **Copy** button.

- Nothing is sent anywhere automatically. You decide where to paste it (any AI assistant, or a human coach).
- Paste the reply into **Trainer's Notes → Add feedback**. Feedback is labelled **AI-GENERATED**, is append-only, and never changes your workout history, goals or program.
- Previous feedback is included in later reports so the trainer can see its own earlier advice.

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
