# Troubleshooting

**"Port 4871 is already in use"**
Start on another port: `npm start -- -p 5000` (or `npm run dev -- -p 5000`). For Docker, edit the host port in `docker-compose.yml` (`"127.0.0.1:5000:3000"`).

**`npm install` fails while building `better-sqlite3` (Windows)**
Normally a prebuilt binary is downloaded. If not, install Node.js 22 LTS, then the "Desktop development with C++" workload from Visual Studio Build Tools, and retry. Or run it with Docker instead.

**"Database unavailable" banner**
The app could not open its SQLite file. Make sure the `data/` folder is writable (or set `DB_PATH` to a writable location) and that no other copy of the app is using the same file.

**My data disappeared after switching between native and Docker**
They use different databases: native uses `./data/iron-standard.db`; Docker uses the `iron_standard_data` volume. Your original data is still where you left it.

**`docker compose down -v` deleted my data**
`-v` removes the volume. Never use it unless you mean to. Restore from a backup if you made one (see the README).

**The page is blank or errors after a `git pull`**
Run `npm install` again, then `npm run build` and `npm start`. If you are using `npm run dev`, stop it, delete the `.next` folder and start it again. Do not run `npm run build` while `npm run dev` is running from the same folder.

**I cannot open the app from my phone or another computer**
By design it listens on `127.0.0.1` only and has no login. Do not expose it to a network without adding authentication and TLS in front of it.

**Still stuck?** Open an issue on GitHub with your OS, Node version (`node -v`) and the error text. Do not paste your database or reports; they contain personal data.
