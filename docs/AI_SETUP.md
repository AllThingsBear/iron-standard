# Setting up the AI trainer

The AI trainer is **optional**. IRON STANDARD works fully without it. When you do use it, nothing is ever sent automatically: you click **Ask AI trainer** on a confirmed workout, and the app asks you to confirm each time. The reply is saved as an **AI-generated** note, and any weight suggestions only take effect if you click **Apply picks**. The AI never changes your logged history, goals or program.

What gets sent: a report with your goals, equipment, limitations, workouts and set notes, and recent metrics. Choose a provider you are comfortable with. A model running on your own computer (option 4) never sends anything anywhere.

## Which option should I pick?

| Option | Cost | Privacy | Setup | Best for |
|---|---|---|---|---|
| **1. Copy and paste** | Free | You decide where it goes | None | Everyone; works with any assistant |
| **2. Claude CLI** | Uses your Claude plan | Sent to Anthropic | Easy | You already use Claude Code |
| **3. API key** (Anthropic or OpenAI-compatible) | Pay per use, billed by the provider | Sent to the provider | Easy | Best answer quality without a strong PC |
| **4. Local model with Ollama** | Free | **Stays on your computer** | A few steps | Privacy, or no internet; needs a decent graphics card |

All of these are chosen in the app: **PROFILE → AI trainer**.

---

## Option 1: Copy and paste (no setup)

1. Log your workout and click **Confirm workout**, then **Send to trainer**.
2. Click **Copy report** and paste it into any AI assistant or send it to a human coach.
3. Paste the reply into **Trainer's Notes → Add feedback**.

## Option 2: Claude CLI

1. Install the Claude Code command-line tool and sign in once by running `claude` in a terminal.
2. In the app: **PROFILE → AI trainer → CLAUDE CLI**. It should say "Found: …".
3. Click **Test connection**.

This only works with the regular (Node.js) install. A Docker container has no CLI inside it.

## Option 3: Your own API key

1. Create an API key with your provider (for example the Anthropic Console, or OpenAI, or OpenRouter). The provider bills you directly.
2. In the app: **PROFILE → AI trainer → ANTHROPIC API** (or **OPENAI-COMPATIBLE**), enter the model name and paste your key.
3. Click **Test connection**.

Your key is stored only in `data/ai.json` on your computer. It is never shown again, never included in exports or backups, and never sent anywhere except your provider. You can set the `AI_API_KEY` environment variable instead (useful with Docker).

---

## Option 4: A local model with Ollama (free and private)

[Ollama](https://ollama.com) runs open AI models on your own computer. We tested this with **Gemma 4 12B** on an NVIDIA RTX 5080 (16 GB).

### Step 0: Check your hardware

The model should fit in your graphics card's memory (VRAM). Sizes below are the download sizes listed on [Ollama's Gemma 4 page](https://ollama.com/library/gemma4); real use is higher because of the context window.

| Your graphics memory | Suggested model | Notes |
|---|---|---|
| **16 GB or more** | `gemma4:12b` (about 8 GB) | **Tested.** Ran 100% on the GPU using about 9 GB of VRAM. |
| **8-12 GB** | `gemma4:e4b` (about 6.6-9.5 GB) | Not tested here. Should fit; expect somewhat weaker advice. |
| **Under 8 GB, or no dedicated GPU** | `gemma4:e2b` or skip local | Not tested. Without a GPU, models run on the CPU and are slow. Consider option 2 or 3. |

How to check: on Windows open **Task Manager → Performance → GPU** and look at "Dedicated GPU memory", or run `nvidia-smi` for NVIDIA cards. Macs share memory between the CPU and GPU; we have not tested that setup.

Local models give shorter and less detailed coaching than the big cloud models. In our test Gemma 4 12B followed the pain rules correctly but was noticeably thinner than Claude.

### Step 1: Install Ollama

- **Windows:** download the installer from [ollama.com/download](https://ollama.com/download), or run this in PowerShell: `irm https://ollama.com/install.ps1 | iex`. It installs for your user only and does not need administrator rights.
- **macOS:** download the app from [ollama.com/download](https://ollama.com/download).
- **Linux:** `curl -fsSL https://ollama.com/install.sh | sh`

Check it works: open a terminal and run `ollama --version`. Ollama listens on `127.0.0.1:11434` only, so nothing outside your computer can reach it. Leave that setting alone unless you know why you are changing it.

### Step 2: Download a model

```bash
ollama pull gemma4:12b
```

This is a one-time download of about 8 GB. Models are stored in `C:\Users\<you>\.ollama\models` on Windows.

### Step 3: Connect it in IRON STANDARD

1. Open **PROFILE → AI trainer** and choose **OLLAMA (LOCAL)**.
2. The app checks that Ollama is running and lists your installed models.
3. Pick `gemma4:12b` and click **Set up for IRON STANDARD**.
4. The app tests the connection and you are done. Confirm a workout and click **Ask AI trainer**.

**What that button does:** it creates a copy of the model named `iron-standard-trainer` with a larger "context window". Ollama's default window is only 4,096 tokens, which is too small for a full report. The beginning of the report (your safety rules) would be silently cut off and the advice would get worse. The copy shares the model you already downloaded, uses almost no extra disk space, and does not change how any other app uses Ollama.

**Doing it by hand** (if you prefer): create a text file named `Modelfile` containing

```
FROM gemma4:12b
PARAMETER num_ctx 16384
```

then run `ollama create iron-standard-trainer -f Modelfile`, and in the app choose **OPENAI-COMPATIBLE** with base URL `http://localhost:11434/v1`, model `iron-standard-trainer`, and no API key.

**Alternative: a global setting.** You can instead set the environment variable `OLLAMA_CONTEXT_LENGTH=16384` and restart Ollama, but that changes the context for every app that uses Ollama (and uses more memory). Per [Ollama's FAQ](https://docs.ollama.com/faq.md): on Windows quit Ollama, edit your account's environment variables, and start Ollama again; on macOS run `launchctl setenv OLLAMA_CONTEXT_LENGTH 16384` and restart the app; on Linux run `systemctl edit ollama.service`, add `Environment="OLLAMA_CONTEXT_LENGTH=16384"` under `[Service]`, then `systemctl daemon-reload` and `systemctl restart ollama`.

### What to expect

- **First request is slow** (about a minute on our test machine) while the model loads from disk. After that, replies take seconds to a few tens of seconds. Ollama unloads an idle model after 5 minutes by default.
- **Reasoning models think first.** Gemma 4 reasons before it answers. The app leaves room for that and never saves the thinking text.
- **Check it is using your GPU:** run `ollama ps`. The `PROCESSOR` column should say `100% GPU`. A split such as `40%/60% CPU/GPU` means the model is too big for your card and will be slow; choose a smaller model.

### Cloud models (not recommended for health data)

Ollama also offers cloud models (names ending in `:cloud`). These run on Ollama's servers, so your report would leave your computer. [Ollama says](https://docs.ollama.com/cloud.md) it does not use prompts for training but does not state how long they are kept. They need you to sign in to Ollama yourself. IRON STANDARD never signs in for you and does not set this up. To switch Ollama's cloud features off entirely, set `OLLAMA_NO_CLOUD=1` and restart it.

### Docker

A container cannot reach an Ollama server that listens only on `127.0.0.1` of the host. Making it reachable means exposing Ollama to your network (`OLLAMA_HOST=0.0.0.0`), which we do not recommend, or running Ollama in the same container network, which we have not tested. The simplest route for local models is the regular (non-Docker) install of IRON STANDARD.

### Troubleshooting

- **"Ollama was not found running"**: install it (step 1) and make sure it is running (on Windows, start it from the Start menu; you can also run `ollama serve` in a terminal).
- **"No model is installed yet"**: run the `ollama pull` command from step 2, then click **Check again**.
- **Empty reply or "ran out of tokens while thinking"**: use **Set up for IRON STANDARD** (it raises the context), close other GPU-heavy programs, or try a smaller or non-reasoning model.
- **Very slow:** run `ollama ps`. If it is not `100% GPU`, the model is too big for your card.
- **Out of memory:** pick a smaller model, and close games or video editors before asking.
- **Uninstall:** remove the helper copy with `ollama rm iron-standard-trainer`, remove models with `ollama rm gemma4:12b`, and uninstall Ollama from Windows Settings → Apps. Your IRON STANDARD data is separate and untouched.

---

## Safety notes

- AI feedback is not medical advice and is not a substitute for a clinician. It can be wrong. The app tells the model your limitations and pain rules, but you are responsible for your training decisions.
- Treat weight suggestions as suggestions. The app never applies them without your click.
- If you share your `data/` folder, remove `ai.json` first. It may contain an API key.
