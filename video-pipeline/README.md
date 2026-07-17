# Safari Video Pipeline

Automated pipeline for tour-trip videos: **ingest → transcribe/analyze → script → edit/export → publish**, built with free/open-source tools (Telethon, rclone, FFmpeg, faster-whisper, edge-tts) and Blotato for publishing.

> **Where this runs.** This is portable code. Build/test happens in the cloud
> session, but the *live* pipeline — Telegram/OneDrive logins, scheduled runs —
> must run on a machine you control (your PC or a small always-on VPS), because
> it needs your credentials and needs to stay running. Clone the repo there,
> follow the setup below, and schedule it.

Build status: **Stage 1 (Ingestion) — complete & tested.** Stages 2–6 land next.

---

## One-time setup

```bash
cd video-pipeline
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt      # Windows: .venv\Scripts\pip install -r requirements.txt

cp .env.example .env                # then fill in secrets
cp config.example.yaml config.yaml  # then edit your chats / OneDrive folder
```

You also need **FFmpeg** and **rclone** on your PATH:
- macOS: `brew install ffmpeg rclone`
- Ubuntu/Debian: `sudo apt install ffmpeg rclone`
- Windows: `winget install Gyan.FFmpeg Rclone.Rclone` (or download the .exe files)

### Telegram credentials
1. Go to <https://my.telegram.org> → **API development tools**.
2. Create an app; copy the **api_id** and **api_hash** into `.env`.
3. List the chats/channels to watch in `config.yaml` under `ingestion.telegram.watch`
   (use `@username` or the numeric id).
4. First run logs you in (Telegram sends a code to your app). A `state/<session>.session`
   file is then reused, so later scheduled runs need no interaction.

### rclone OneDrive remote
Run `rclone config` and:
1. `n` → new remote → name it **`onedrive`** (must match `ingestion.onedrive.remote`).
2. Storage type: **`onedrive`** (Microsoft OneDrive).
3. Leave client_id/secret blank (press Enter) to use rclone's defaults.
4. Choose **OneDrive Personal or Business** (option 1 for a personal account).
5. It opens a browser to sign in and authorize. **Headless server?** Run
   `rclone authorize "onedrive"` on a desktop, then paste the token back.
6. Pick the drive, confirm, `y` to save.

Set the folder to sync in `config.yaml` under `ingestion.onedrive.path`
(e.g. `SafariVideos`; use `""` for the drive root).

Test the remote: `rclone lsd onedrive:` should list your top-level folders.

---

## Stage 1 — Ingestion

Pulls new videos from Telegram and OneDrive into a single `inbox/`, skipping
anything already downloaded.

```bash
# See what WOULD be downloaded, without downloading:
.venv/bin/python src/ingest.py --dry-run

# Real run, both sources:
.venv/bin/python src/ingest.py

# Just one source:
.venv/bin/python src/ingest.py --source telegram
.venv/bin/python src/ingest.py --source onedrive
```

**How "skip already-downloaded" works** — `state/ingest_ledger.json` tracks two things:
- a **source key** per item (`telegram:@chan:<msg_id>`, `onedrive:<path>`) so we
  never re-fetch from the source, and
- a **sha256 content hash** so the *same clip arriving from both* Telegram and
  OneDrive is stored only once.

Offline test of that logic (no accounts needed):
```bash
# generate three tiny clips (A, a copy of A, and a different B) then run the checks
mkdir -p /tmp/vids
ffmpeg -y -f lavfi -i testsrc=duration=2:size=320x240:rate=15 -pix_fmt yuv420p /tmp/vids/clipA.mp4
ffmpeg -y -f lavfi -i mandelbrot=size=320x240:rate=15 -t 2 -pix_fmt yuv420p /tmp/vids/clipB.mp4
cp /tmp/vids/clipA.mp4 /tmp/vids/clipA_copy.mp4
PYTHONPATH=src .venv/bin/python src/test_ingest_dedup.py /tmp/vids
```

---

## Directory layout

```
video-pipeline/
├── src/                 # pipeline code
├── inbox/               # new videos land here (gitignored)
├── work/                # per-video working dir: transcript, keyframes, script (gitignored)
├── output/              # exported 16:9 and 9:16 videos (gitignored)
├── assets/music/        # background music you drop in (gitignored)
├── state/               # ledger, logs, Telegram session (gitignored)
├── config.example.yaml  # copy to config.yaml
└── .env.example         # copy to .env
```

Nothing in `inbox/ work/ output/ state/` or your secrets is ever committed.
