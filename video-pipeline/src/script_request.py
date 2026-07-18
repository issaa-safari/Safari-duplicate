"""Stage 3 — generate SCRIPT_REQUEST.md per analyzed video.

Because the footage is mostly b-roll, the request is built around the shot
THUMBNAILS: it lists each candidate segment with its thumbnail filename and asks
you to attach those images to the Claude chat so Claude can see the footage and
write a voiceover script, on-screen captions, per-platform post captions, and an
edit plan. The pipeline then pauses until you drop the returned JSON as
work/<video_name>/script.json.

Usage:
    python src/script_request.py [--video <name>] [--force]
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import common as C

PROMPT_HEADER = """\
You are a short-form travel-video editor and copywriter for **Safari Adventure
Riders**, a Kenya–Tanzania safari & motorbike-tour operator. I will attach the
shot thumbnails for one raw clip. Using ONLY what you can see in those images
(the footage has little or no narration), produce a plan to turn the raw clip
into a punchy social video.

Return your answer as a SINGLE JSON code block matching the schema at the end.
Do not include anything outside the JSON block.

Deliver:
1. keep_segments — pick the strongest shots from the candidate list below and
   order them for the best flow. Reference the segment start/end times exactly.
2. voiceover — a short, warm narration (this becomes the spoken audio). Keep it
   to the length of the kept footage; roughly 2.5 words per second.
3. captions — a few on-screen text overlays (hook first, call-to-action last).
4. post_captions — platform-specific post text (Instagram, TikTok, YouTube
   Shorts, Facebook) with relevant hashtags and an on-brand tone.
"""


def _fmt_segments(segments: list[dict[str, Any]]) -> str:
    lines = ["| # | start | end | dur | thumbnail (attach this image) |",
             "|---|-------|-----|-----|-------------------------------|"]
    for s in segments:
        lines.append(f"| {s['index']} | {s['start']:g}s | {s['end']:g}s | "
                     f"{s['duration']:g}s | `keyframes/{s.get('thumbnail','?')}` |")
    return "\n".join(lines)


def _transcript_block(transcript: dict[str, Any]) -> str:
    if not transcript.get("has_speech"):
        return ("_No speech detected — this is b-roll. Base the script on the "
                "attached thumbnails, not on any transcript._")
    lines = [f"Detected language: **{transcript.get('language')}**", "", "```"]
    for seg in transcript.get("segments", []):
        lines.append(f"[{seg['start']:.1f}-{seg['end']:.1f}] {seg['text']}")
    lines.append("```")
    return "\n".join(lines)


def build_markdown(work_dir: Path, meta: dict[str, Any], scenes: dict[str, Any],
                   transcript: dict[str, Any], schema_text: str) -> str:
    name = meta["video_name"]
    probe = meta.get("probe", {})
    segments = scenes.get("segments", [])
    thumbs = [f"keyframes/{s['thumbnail']}" for s in segments if s.get("thumbnail")]

    example = {
        "video_name": name,
        "title": "…",
        "keep_segments": [{"start": s["start"], "end": s["end"]} for s in segments[:2]] or
                         [{"start": 0, "end": min(5, probe.get("duration") or 5)}],
        "voiceover": [{"text": "…"}],
        "captions": [{"text": "…", "start": 0, "end": 3}],
        "music": {"track": None, "gain_db": -18},
        "post_captions": {"instagram": "… #safari", "tiktok": "…", "youtube": "…", "facebook": "…"},
    }

    return f"""\
# Script request — `{name}`

**Status:** waiting for your script. When done, save the JSON as
`work/{name}/script.json` and re-run the pipeline.

- Duration: **{probe.get('duration')}s**  ·  Resolution: {probe.get('width')}×{probe.get('height')}  ·  {probe.get('fps')} fps
- Speech: **{'yes' if transcript.get('has_speech') else 'no (b-roll)'}**
- Candidate segments: **{len(segments)}**

## How to use this
1. Open the Claude chat.
2. **Attach these {len(thumbs)} thumbnail image(s)** from `work/{name}/keyframes/`:
   {', '.join('`'+t+'`' for t in thumbs) if thumbs else '(none — check analysis)'}
3. Paste the prompt block below.
4. Save Claude's JSON reply to `work/{name}/script.json`.

---

## Candidate segments
{_fmt_segments(segments)}

## Transcript
{_transcript_block(transcript)}

---

## ⤵ PROMPT TO PASTE INTO CLAUDE (attach the thumbnails above first)

{PROMPT_HEADER}
### Candidate segments (use these exact start/end values)
{_fmt_segments(segments)}

### Return JSON in exactly this shape
```json
{json.dumps(example, indent=2)}
```

### Full JSON schema your answer must satisfy
```json
{schema_text}
```
"""


def needs_request(work_dir: Path, force: bool) -> bool:
    meta_path = work_dir / "metadata.json"
    if not meta_path.exists():
        return False
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return False
    if meta.get("stages", {}).get("analyze") != "done":
        return False
    if (work_dir / "script.json").exists():
        return False  # already scripted; nothing to request
    if (work_dir / "SCRIPT_REQUEST.md").exists() and not force:
        return False
    return True


def generate(work_dir: Path, logger) -> bool:
    meta = json.loads((work_dir / "metadata.json").read_text(encoding="utf-8"))
    scenes = json.loads((work_dir / "scenes.json").read_text(encoding="utf-8"))
    transcript = json.loads((work_dir / "transcript.json").read_text(encoding="utf-8"))
    schema_text = (C.PIPELINE_ROOT / "schema" / "script.schema.json").read_text(encoding="utf-8")

    md = build_markdown(work_dir, meta, scenes, transcript, schema_text)
    (work_dir / "SCRIPT_REQUEST.md").write_text(md, encoding="utf-8")

    meta.setdefault("stages", {})["script_request"] = "generated"
    meta["updated_at"] = datetime.now(timezone.utc).isoformat()
    (work_dir / "metadata.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False),
                                            encoding="utf-8")
    logger.info("Wrote work/%s/SCRIPT_REQUEST.md", work_dir.name)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage 3: generate SCRIPT_REQUEST.md")
    parser.add_argument("--video", help="Only this video (name/stem).")
    parser.add_argument("--force", action="store_true", help="Regenerate even if present.")
    args = parser.parse_args()

    C.load_env()
    logger = C.get_logger()

    dirs = [C.WORK_DIR / C.safe_filename(args.video)] if args.video else \
           sorted(p for p in C.WORK_DIR.iterdir() if p.is_dir())

    logger.info("=== Stage 3: script requests ===")
    made = 0
    waiting = []
    for d in dirs:
        if not d.exists():
            logger.error("No work dir: %s", d)
            continue
        if needs_request(d, args.force):
            generate(d, logger)
            made += 1
            waiting.append(d.name)
        elif (d / "SCRIPT_REQUEST.md").exists() and not (d / "script.json").exists():
            waiting.append(d.name)

    logger.info("=== %d request(s) generated. Awaiting script.json for: %s ===",
                made, ", ".join(waiting) if waiting else "(none)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
