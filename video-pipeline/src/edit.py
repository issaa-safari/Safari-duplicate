"""Stage 4 — edit + export.

Reads work/<video_name>/script.json (validated) and produces, in
output/<video_name>/:
  * <name>_16x9.mp4   — 1920x1080 (padded to fit)
  * <name>_9x16.mp4   — 1080x1920 (auto-cropped to cover)

Pipeline: cut keep_segments -> concat -> synth voiceover (edge-tts) -> mix music
(assets/music) -> reframe per format -> burn captions -> mux audio.

Usage:
    python src/edit.py --video <name> [--force] [--formats 16x9,9x16]
"""
from __future__ import annotations

import argparse
import asyncio
import json
import random
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import common as C
import script_io

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]
FORMATS = {
    "16x9": (1920, 1080),
    "9x16": (1080, 1920),
}


def run(cmd: list[str], logger, what: str) -> bool:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        logger.error("%s failed:\n%s", what, proc.stderr.strip()[-600:])
        return False
    return True


def ffprobe_duration(path: Path) -> float:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    try:
        return round(float(proc.stdout.strip()), 3)
    except ValueError:
        return 0.0


def find_font(cfg: dict[str, Any]) -> str | None:
    configured = (cfg.get("caption") or {}).get("font")
    if configured and Path(configured).exists():
        return configured
    for f in FONT_CANDIDATES:
        if Path(f).exists():
            return f
    return None  # fall back to fontconfig 'Sans'


# --------------------------------------------------------------------------- #
# 1) Cut + concatenate the kept segments (video only; source audio dropped)
# --------------------------------------------------------------------------- #
def cut_and_concat(source: Path, segments: list[dict[str, Any]], tmp: Path,
                   fps: float | None, logger) -> tuple[Path | None, float]:
    tmp.mkdir(parents=True, exist_ok=True)
    parts = []
    r = str(fps) if fps else "30"
    for i, seg in enumerate(segments):
        out = tmp / f"seg_{i:03d}.mp4"
        ok = run(
            ["ffmpeg", "-y", "-ss", str(seg["start"]), "-to", str(seg["end"]),
             "-i", str(source), "-an", "-r", r,
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
             "-pix_fmt", "yuv420p", str(out)],
            logger, f"cut segment {i}")
        if not ok:
            return None, 0.0
        parts.append(out)

    concat_list = tmp / "concat.txt"
    concat_list.write_text("".join(f"file '{p.name}'\n" for p in parts), encoding="utf-8")
    master = tmp / "master_novo.mp4"
    ok = run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list),
              "-c", "copy", str(master)], logger, "concat segments")
    if not ok:
        return None, 0.0
    return master, ffprobe_duration(master)


# --------------------------------------------------------------------------- #
# 2) Voiceover via edge-tts
# --------------------------------------------------------------------------- #
async def _edge_tts_save(text: str, voice: str, out: Path) -> None:
    import edge_tts
    await edge_tts.Communicate(text, voice).save(str(out))


def synth_voiceover(vo_lines: list[dict[str, Any]], voice: str, tmp: Path,
                    logger) -> list[dict[str, Any]]:
    items = []
    cursor = 0.0
    for i, line in enumerate(vo_lines):
        text = line.get("text", "").strip()
        if not text:
            continue
        mp3 = tmp / f"vo_{i:03d}.mp3"
        try:
            asyncio.run(_edge_tts_save(text, voice, mp3))
        except Exception as exc:  # noqa: BLE001
            logger.error("tts line %d failed: %s", i, exc)
            continue
        if not mp3.exists():
            continue
        dur = ffprobe_duration(mp3)
        start = float(line["start"]) if "start" in line else cursor
        cursor = start + dur
        items.append({"file": mp3, "start": start, "dur": dur})
    return items


def build_voice_track(items: list[dict[str, Any]], total: float, tmp: Path, logger) -> Path | None:
    if not items:
        return None
    inputs, filters, labels = [], [], []
    for i, it in enumerate(items):
        inputs += ["-i", str(it["file"])]
        ms = int(round(it["start"] * 1000))
        filters.append(f"[{i}:a]adelay={ms}:all=1[d{i}]")
        labels.append(f"[d{i}]")
    n = len(items)
    mix = "".join(labels) + f"amix=inputs={n}:normalize=0,apad,atrim=0:{total}[vo]"
    fc = ";".join(filters + [mix])
    out = tmp / "voice.wav"
    ok = run(["ffmpeg", "-y", *inputs, "-filter_complex", fc, "-map", "[vo]", str(out)],
             logger, "build voice track")
    return out if ok else None


# --------------------------------------------------------------------------- #
# 3) Music bed
# --------------------------------------------------------------------------- #
def pick_music(script_music: dict[str, Any], cfg: dict[str, Any], logger) -> Path | None:
    track = (script_music or {}).get("track")
    if track:
        p = C.MUSIC_DIR / track
        if p.exists():
            return p
        logger.warning("music track '%s' not found in assets/music — ignoring.", track)
    if (cfg.get("music") or {}).get("auto_pick", True):
        choices = [p for p in C.MUSIC_DIR.iterdir()
                   if p.is_file() and p.suffix.lower() in (".mp3", ".m4a", ".wav", ".aac", ".ogg")]
        if choices:
            chosen = random.choice(choices)
            logger.info("  auto-picked music: %s", chosen.name)
            return chosen
    return None


def build_music_bed(music: Path, total: float, gain_db: float, tmp: Path, logger) -> Path | None:
    out = tmp / "music_bed.wav"
    ok = run(["ffmpeg", "-y", "-stream_loop", "-1", "-i", str(music), "-t", str(total),
              "-filter:a", f"volume={gain_db}dB,afade=t=out:st={max(0.0, total-1.0)}:d=1",
              str(out)], logger, "build music bed")
    return out if ok else None


def mix_audio(voice: Path | None, music: Path | None, total: float, tmp: Path, logger) -> Path | None:
    if not voice and not music:
        return None
    out = tmp / "audio.m4a"
    if voice and music:
        fc = "[0:a][1:a]amix=inputs=2:normalize=0:duration=longest[a]"
        ok = run(["ffmpeg", "-y", "-i", str(voice), "-i", str(music),
                  "-filter_complex", fc, "-map", "[a]", "-c:a", "aac", str(out)],
                 logger, "mix audio")
    else:
        single = voice or music
        ok = run(["ffmpeg", "-y", "-i", str(single), "-c:a", "aac", str(out)],
                 logger, "encode audio")
    return out if ok else None


# --------------------------------------------------------------------------- #
# 4) Reframe + burn captions + mux, per format
# --------------------------------------------------------------------------- #
def _reframe_filter(fmt: str) -> str:
    w, h = FORMATS[fmt]
    if fmt == "16x9":
        return (f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
                f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1")
    # 9x16: cover then centre-crop (auto-crop)
    return (f"scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1")


def _caption_filters(captions: list[dict[str, Any]], fmt: str, font: str | None,
                     cfg: dict[str, Any], tmp: Path) -> str:
    if not captions:
        return ""
    w, h = FORMATS[fmt]
    ccfg = cfg.get("caption") or {}
    fontsize = max(18, int(h * float(ccfg.get("fontsize_ratio", 0.045))))
    box_op = float(ccfg.get("box_opacity", 0.5))
    y = f"h*{ccfg.get('y_ratio', 0.80)}"
    font_arg = f"fontfile='{font}'" if font else "font='Sans'"
    filters = []
    for i, cap in enumerate(captions):
        cap_file = tmp / f"cap_{fmt}_{i:03d}.txt"
        cap_file.write_text(cap["text"], encoding="utf-8")
        filters.append(
            f"drawtext={font_arg}:textfile='{cap_file}':expansion=none:"
            f"fontcolor=white:fontsize={fontsize}:"
            f"box=1:boxcolor=black@{box_op}:boxborderw={max(8, fontsize//3)}:"
            f"x=(w-text_w)/2:y={y}:"
            f"enable='between(t,{cap['start']},{cap['end']})'"
        )
    return "," + ",".join(filters)


def render_format(master: Path, audio: Path | None, captions: list[dict[str, Any]],
                  fmt: str, out_path: Path, final_dur: float, video_dur: float,
                  font: str | None, cfg: dict[str, Any], tmp: Path, logger) -> bool:
    vf = _reframe_filter(fmt)
    extra = max(0.0, final_dur - video_dur)
    if extra > 0.05:  # freeze last frame to cover trailing narration
        vf += f",tpad=stop_mode=clone:stop_duration={round(extra, 3)}"
    vf += _caption_filters(captions, fmt, font, cfg, tmp)

    crf = str((cfg.get("crf", 20)))
    cmd = ["ffmpeg", "-y", "-i", str(master)]
    if audio:
        cmd += ["-i", str(audio)]
    cmd += ["-filter_complex", f"[0:v]{vf}[v]", "-map", "[v]"]
    if audio:
        cmd += ["-map", "1:a", "-c:a", "aac", "-shortest"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", crf,
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            "-t", str(round(final_dur, 3)), str(out_path)]
    return run(cmd, logger, f"render {fmt}")


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def load_export_cfg(config: dict[str, Any]) -> dict[str, Any]:
    e = dict(config.get("export", {}))
    e.setdefault("crf", 20)
    e.setdefault("caption", {})
    e.setdefault("music", {})
    e.setdefault("voiceover", {})
    e["voiceover"].setdefault("default_voice", "en-US-AriaNeural")
    e["music"].setdefault("default_gain_db", -18)
    e["music"].setdefault("auto_pick", True)
    return e


def edit_one(name: str, config: dict[str, Any], formats: list[str], logger, force: bool) -> bool:
    work_dir = C.WORK_DIR / C.safe_filename(name)
    script, errors = script_io.load_and_validate(work_dir)
    if errors:
        logger.error("script.json for '%s' is invalid:", name)
        for e in errors:
            logger.error("   - %s", e)
        return False

    meta = json.loads((work_dir / "metadata.json").read_text(encoding="utf-8"))
    source = C.PIPELINE_ROOT / meta["source_file"]
    if not source.exists():
        logger.error("source video missing: %s", source)
        return False

    out_dir = C.OUTPUT_DIR / C.safe_filename(name)
    if out_dir.exists() and any(out_dir.glob("*.mp4")) and not force:
        logger.info("Skip %s (already exported; use --force).", name)
        return False
    out_dir.mkdir(parents=True, exist_ok=True)

    ecfg = load_export_cfg(config)
    font = find_font(ecfg)
    tmp = work_dir / "_edit_tmp"
    fps = (meta.get("probe") or {}).get("fps")

    logger.info("Editing '%s' (%d segment(s), %d format(s))",
                name, len(script["keep_segments"]), len(formats))

    # 1) cut + concat
    master, video_dur = cut_and_concat(source, script["keep_segments"], tmp, fps, logger)
    if not master:
        return False
    logger.info("  edited video length: %ss", video_dur)

    # 2) voiceover
    voice_name = script.get("voice") or ecfg["voiceover"]["default_voice"]
    vo_items = synth_voiceover(script.get("voiceover", []), voice_name, tmp, logger)
    audio_dur = max((it["start"] + it["dur"] for it in vo_items), default=0.0)
    final_dur = max(video_dur, audio_dur)
    voice_track = build_voice_track(vo_items, final_dur, tmp, logger) if vo_items else None
    if vo_items:
        logger.info("  voiceover: %d line(s), voice=%s", len(vo_items), voice_name)

    # 3) music
    music_src = pick_music(script.get("music", {}), ecfg, logger)
    gain = float((script.get("music") or {}).get("gain_db", ecfg["music"]["default_gain_db"]))
    music_bed = build_music_bed(music_src, final_dur, gain, tmp, logger) if music_src else None

    # mix
    audio = mix_audio(voice_track, music_bed, final_dur, tmp, logger)

    # 4) render each format
    ok_all = True
    outputs = []
    for fmt in formats:
        out_path = out_dir / f"{C.safe_filename(name)}_{fmt}.mp4"
        if render_format(master, audio, script.get("captions", []), fmt, out_path,
                         final_dur, video_dur, font, ecfg, tmp, logger):
            logger.info("  ✔ %s", out_path.relative_to(C.PIPELINE_ROOT))
            outputs.append(out_path.name)
        else:
            ok_all = False

    # record status
    meta.setdefault("stages", {})["edit"] = "done" if ok_all else "error"
    meta["outputs"] = outputs
    meta["updated_at"] = datetime.now(timezone.utc).isoformat()
    (work_dir / "metadata.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False),
                                            encoding="utf-8")

    # cleanup intermediates
    for p in tmp.glob("*"):
        p.unlink()
    tmp.rmdir()
    return ok_all


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage 4: edit + export")
    parser.add_argument("--video", help="Video name/stem (default: all with a valid script.json).")
    parser.add_argument("--formats", default="16x9,9x16", help="Comma list: 16x9,9x16")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    C.load_env()
    logger = C.get_logger()
    config = C.load_config()
    formats = [f.strip() for f in args.formats.split(",") if f.strip() in FORMATS]
    if not formats:
        logger.error("No valid formats in %r (choices: %s)", args.formats, ", ".join(FORMATS))
        return 1

    if args.video:
        names = [args.video]
    else:
        names = [d.name for d in sorted(C.WORK_DIR.iterdir())
                 if d.is_dir() and (d / "script.json").exists()]
        if not names:
            logger.info("No videos with a script.json to edit.")
            return 0

    logger.info("=== Stage 4: edit + export (%d video(s)) ===", len(names))
    done = sum(edit_one(n, config, formats, logger, args.force) for n in names)
    logger.info("=== Edit complete: %d video(s) exported ===", done)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
