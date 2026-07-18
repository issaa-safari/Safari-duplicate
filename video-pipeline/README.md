# Safari Video Pipeline

Automated pipeline for tour-trip videos: **ingest → transcribe/analyze → script → edit/export → publish**, built with free/open-source tools (Telethon, rclone, FFmpeg, faster-whisper, edge-tts) and Blotato for publishing.

> **Where this runs.** This is portable code. Build/test happens in the cloud
> session, but the *live* pipeline — Telegram/OneDrive logins, scheduled runs —
> must run on a machine you control (your PC or a small always-on VPS), because
> it needs your credentials and needs to stay running. Clone the repo there,
> follow the setup below, and schedule it.

Build status: **Stages 1–3 complete & tested.** Stages 4–6 land next.

> **These videos are mostly b-roll** (scenery, wildlife, bikes — little or no
> narration), so Stage 2 treats the *visuals* as the content: keyframes + shot
> detection are primary, and speech transcription only kicks in when a clip
> actually contains speech (no Whisper hallucination on silent/music footage).

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

## Stage 2 — Analysis (keyframes + scenes + optional speech)

For each new video in `inbox/`, writes `work/<name>/`:
- `keyframes/` — interval frames **plus one representative thumbnail per shot**
  (`scene_00_2s.jpg`, …), which is what you'll show Claude at Stage 3.
- `scenes.json` — shot cuts turned into **candidate segments** (`start`/`end`/
  `duration`/`thumbnail`) — the raw material for the edit plan.
- `transcript.json` — real speech only; `has_speech: false` + empty text on b-roll.
- `metadata.json` — probe info (duration/res/fps) + stage status.

```bash
.venv/bin/python src/analyze.py            # process all new inbox videos
.venv/bin/python src/analyze.py --video safari_intro_demo
.venv/bin/python src/analyze.py --force    # re-analyze
```

Tuning lives under `analysis:` in `config.yaml`: `keyframe_interval_seconds`,
`scene_threshold` (lower = more cuts), and `speech.enabled` (set `false` to skip
Whisper entirely if none of your clips have narration).

---

## Stage 3 — Script request (semi-manual, the human-in-the-loop step)

```bash
.venv/bin/python src/script_request.py     # writes work/<name>/SCRIPT_REQUEST.md
```

Each `SCRIPT_REQUEST.md` is a self-contained brief: the candidate-segment table,
a paste-ready prompt, and the full JSON schema. To produce a script:

1. Open the Claude chat, **attach the shot thumbnails** it lists
   (`work/<name>/keyframes/scene_*.jpg`), and paste the prompt block.
2. Save Claude's JSON reply as **`work/<name>/script.json`**.

`script.json` (schema in `schema/script.schema.json`) carries: `keep_segments`
(source cuts, in final order), `voiceover` lines, on-screen `captions`, optional
`music`, and per-platform `post_captions`. The pipeline validates it (structure
+ that times fit the clip) before Stage 4 touches it — invalid drops are
reported, not silently edited.

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
