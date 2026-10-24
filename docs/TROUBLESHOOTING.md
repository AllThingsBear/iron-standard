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

**`403 Host not allowed` when using a reverse proxy or another hostname**
The app only answers requests addressed to `localhost`, `127.0.0.1` or `[::1]`. If you serve it behind a proxy under another name, set `ALLOWED_HOSTS=my.host.name` and put authentication in front of it (the app itself has no login).

**"Ask AI trainer" fails**
- *Claude CLI:* run `claude` once in a terminal to sign in, make sure it is on your PATH, then use **Test connection** in PROFILE → AI trainer.
- *API providers:* check the key, model name and base URL. For Ollama use `http://localhost:11434/v1` and a model you have pulled.
- *Ollama / local models:* choose **OLLAMA (LOCAL)** in PROFILE → AI trainer and click **Set up for IRON STANDARD**. It raises Ollama's context window for this app only (the default of 4096 tokens would silently cut off the start of the report, including your safety rules). `ollama ps` shows whether the model fits on your GPU. Full guide: [AI_SETUP.md](AI_SETUP.md). Many local models (Gemma 4, Qwen3, gpt-oss) are "reasoning" models that think before answering; the app leaves room for that, but a very small context window can still run out before the answer. Bigger models need more memory; if one is too slow, pick a smaller one.
- The error message from the provider is shown in the red banner. Nothing is saved if the request fails.

**Still stuck?** Open an issue on GitHub with your OS, Node version (`node -v`) and the error text. Do not paste your database or reports; they contain personal data.
