"""Stage 2 — analysis (keyframes + scene detection + optional speech).

Most tour footage is b-roll with no narration, so the useful signal is visual:
  * keyframes/       — one JPEG every N seconds (what Claude "sees" at Stage 3)
  * scenes           — shot-cut timestamps -> candidate segments to keep
  * transcript.json  — ONLY if real speech is detected, else empty (no Whisper
                       hallucination on silent/music footage)

Outputs per video into work/<video_name>/:
  keyframes/*.jpg, transcript.json, scenes.json, metadata.json

Usage:
    python src/analyze.py [--video <name>] [--force]
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import common as C

_model_cache: dict[str, Any] = {}


# --------------------------------------------------------------------------- #
# FFmpeg / ffprobe helpers
# --------------------------------------------------------------------------- #
def ffprobe(video: Path, logger) -> dict[str, Any]:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "format=duration:stream=width,height,avg_frame_rate",
         "-of", "json", str(video)],
        capture_output=True, text=True,
    )
    info: dict[str, Any] = {"duration": None, "width": None, "height": None, "fps": None}
    if proc.returncode != 0:
        logger.warning("ffprobe failed for %s: %s", video.name, proc.stderr.strip())
        return info
    data = json.loads(proc.stdout or "{}")
    fmt, streams = data.get("format", {}), data.get("streams", [])
    if fmt.get("duration"):
        info["duration"] = round(float(fmt["duration"]), 3)
    if streams:
        s = streams[0]
        info["width"], info["height"] = s.get("width"), s.get("height")
        try:
            num, den = s.get("avg_frame_rate", "0/0").split("/")
            info["fps"] = round(int(num) / int(den), 3) if int(den) else None
        except (ValueError, ZeroDivisionError):
            info["fps"] = None
    return info


def has_audio_stream(video: Path) -> bool:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
         "stream=index", "-of", "csv=p=0", str(video)],
        capture_output=True, text=True,
    )
    return bool(proc.stdout.strip())


def extract_keyframes(video: Path, out_dir: Path, interval: int, quality: int, logger) -> list[str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("frame_*.jpg"):
        old.unlink()
    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", str(video), "-vf", f"fps=1/{interval}",
         "-q:v", str(quality), str(out_dir / "frame_%04d.jpg")],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        logger.warning("keyframe extraction failed: %s", proc.stderr.strip()[-300:])
        return []
    return sorted(p.name for p in out_dir.glob("frame_*.jpg"))


_SHOWINFO_PTS = re.compile(r"pts_time:([0-9.]+)")


def detect_scenes(video: Path, threshold: float, duration: float | None, logger) -> list[dict[str, Any]]:
    """Detect shot cuts and return candidate segments [{index,start,end,duration}]."""
    proc = subprocess.run(
        ["ffmpeg", "-i", str(video), "-filter:v",
         f"select='gt(scene,{threshold})',showinfo", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    cut_times = sorted({round(float(m), 3) for m in _SHOWINFO_PTS.findall(proc.stderr)})
    # Build contiguous segments from cut points.
    bounds = [0.0] + [t for t in cut_times if t > 0.05]
    if duration:
        bounds.append(round(duration, 3))
    bounds = sorted(set(bounds))
    segments = []
    for i in range(len(bounds) - 1):
        start, end = bounds[i], bounds[i + 1]
        if end - start < 0.2:  # ignore micro-slivers
            continue
        segments.append({
            "index": len(segments),
            "start": start,
            "end": end,
            "duration": round(end - start, 3),
        })
    if not segments and duration:  # single-shot clip
        segments = [{"index": 0, "start": 0.0, "end": round(duration, 3),
                     "duration": round(duration, 3)}]
    logger.info("  %d scene cut(s) -> %d candidate segment(s).", len(cut_times), len(segments))
    return segments


def extract_scene_thumbnails(video: Path, segments: list[dict[str, Any]],
                             out_dir: Path, quality: int, logger) -> None:
    """Grab one representative frame (segment midpoint) per candidate segment.

    Adds a 'thumbnail' filename to each segment dict. These are what Stage 3
    shows Claude so it can see each shot next to its timestamp.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("scene_*.jpg"):
        old.unlink()
    for seg in segments:
        mid = round((seg["start"] + seg["end"]) / 2, 3)
        fname = f"scene_{seg['index']:02d}_{mid:g}s.jpg"
        proc = subprocess.run(
            ["ffmpeg", "-y", "-ss", str(mid), "-i", str(video),
             "-frames:v", "1", "-q:v", str(quality), str(out_dir / fname)],
            capture_output=True, text=True,
        )
        seg["thumbnail"] = fname if proc.returncode == 0 else None


# --------------------------------------------------------------------------- #
# Optional speech transcription (speech-aware, no hallucination on b-roll)
# --------------------------------------------------------------------------- #
def get_model(cfg: dict[str, Any], logger):
    key = (cfg["whisper_model"], cfg["device"], cfg["compute_type"])
    if key not in _model_cache:
        from faster_whisper import WhisperModel
        logger.info("  loading Whisper '%s' (%s/%s)...", *key)
        _model_cache[key] = WhisperModel(cfg["whisper_model"], device=cfg["device"],
                                         compute_type=cfg["compute_type"])
    return _model_cache[key]


def transcribe_if_speech(video: Path, cfg: dict[str, Any], duration: float | None, logger) -> dict[str, Any]:
    """Return a transcript dict. If no real speech, has_speech=False + empty text."""
    empty = {"has_speech": False, "language": None, "segments": [], "text": ""}
    if not cfg.get("enabled", True):
        logger.info("  speech transcription disabled in config — skipping.")
        return empty
    if not has_audio_stream(video):
        logger.info("  no audio stream — b-roll, empty transcript.")
        return empty

    model = get_model(cfg, logger)
    # VAD on + no cross-segment conditioning => far less hallucination on music/ambient.
    segments, info = model.transcribe(
        str(video), language=cfg.get("language"),
        vad_filter=True, condition_on_previous_text=False,
    )
    seg_list, parts, speech_dur = [], [], 0.0
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        seg_list.append({"id": seg.id, "start": round(seg.start, 3),
                         "end": round(seg.end, 3), "text": text})
        parts.append(text)
        speech_dur += max(0.0, seg.end - seg.start)

    coverage = (speech_dur / duration) if duration else 0.0
    min_cov = float(cfg.get("min_speech_coverage", 0.10))
    if not seg_list or coverage < min_cov:
        logger.info("  speech coverage %.0f%% < %.0f%% -> treating as b-roll (empty transcript).",
                    coverage * 100, min_cov * 100)
        return empty

    logger.info("  speech detected: %s (%.0f%% coverage), %d segment(s).",
                info.language, coverage * 100, len(seg_list))
    return {"has_speech": True, "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "segments": seg_list, "text": " ".join(parts).strip()}


# --------------------------------------------------------------------------- #
# Per-video processing
# --------------------------------------------------------------------------- #
def is_done(work_dir: Path) -> bool:
    meta = work_dir / "metadata.json"
    if not meta.exists():
        return False
    try:
        return json.loads(meta.read_text(encoding="utf-8")).get("stages", {}).get("analyze") == "done"
    except (json.JSONDecodeError, OSError):
        return False


def process_video(video: Path, cfg: dict[str, Any], logger, force: bool) -> bool:
    name = video.stem
    work_dir = C.WORK_DIR / C.safe_filename(name)
    if is_done(work_dir) and not force:
        logger.info("Skip %s (already analyzed).", name)
        return False

    work_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Analyzing %s", video.name)

    probe = ffprobe(video, logger)
    logger.info("  probe: %ss, %sx%s @ %sfps",
                probe["duration"], probe["width"], probe["height"], probe["fps"])

    frames = extract_keyframes(video, work_dir / "keyframes",
                               cfg["keyframe_interval_seconds"], cfg["keyframe_quality"], logger)
    logger.info("  %d keyframe(s).", len(frames))

    segments = detect_scenes(video, cfg["scene_threshold"], probe["duration"], logger)
    extract_scene_thumbnails(video, segments, work_dir / "keyframes", cfg["keyframe_quality"], logger)
    (work_dir / "scenes.json").write_text(
        json.dumps({"scene_threshold": cfg["scene_threshold"], "segments": segments},
                   indent=2), encoding="utf-8")

    transcript = transcribe_if_speech(video, cfg["speech"], probe["duration"], logger)
    (work_dir / "transcript.json").write_text(
        json.dumps(transcript, indent=2, ensure_ascii=False), encoding="utf-8")

    metadata = {
        "video_name": name,
        "source_file": str(video.relative_to(C.PIPELINE_ROOT)),
        "probe": probe,
        "keyframes": {"interval_seconds": cfg["keyframe_interval_seconds"],
                      "count": len(frames), "dir": "keyframes"},
        "scenes": {"count": len(segments), "file": "scenes.json"},
        "transcript": {"file": "transcript.json", "has_speech": transcript["has_speech"],
                       "language": transcript.get("language")},
        "stages": {"analyze": "done"},
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    (work_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("  wrote work/%s/ (keyframes, scenes.json, transcript.json, metadata.json)", work_dir.name)
    return True


def find_inbox_videos(config: dict[str, Any]) -> list[Path]:
    exts = config.get("ingestion", {}).get("video_extensions",
                                           [".mp4", ".mov", ".mkv", ".avi", ".m4v", ".webm"])
    return sorted(p for p in C.INBOX_DIR.iterdir() if p.is_file() and C.is_video(p, exts))


def load_analysis_cfg(config: dict[str, Any]) -> dict[str, Any]:
    a = dict(config.get("analysis", {}))
    a.setdefault("keyframe_interval_seconds", 5)
    a.setdefault("keyframe_quality", 3)
    a.setdefault("scene_threshold", 0.35)
    speech = dict(a.get("speech", {}))
    speech.setdefault("enabled", True)
    speech.setdefault("whisper_model", "base")
    speech.setdefault("language", None)
    speech.setdefault("device", "cpu")
    speech.setdefault("compute_type", "int8")
    speech.setdefault("min_speech_coverage", 0.10)
    a["speech"] = speech
    return a


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage 2: keyframes + scenes + optional speech")
    parser.add_argument("--video", help="Process only this inbox file (name or stem).")
    parser.add_argument("--force", action="store_true", help="Redo even if already done.")
    args = parser.parse_args()

    C.load_env()
    logger = C.get_logger()
    config = C.load_config()
    cfg = load_analysis_cfg(config)

    videos = find_inbox_videos(config)
    if args.video:
        want = C.safe_filename(args.video)
        videos = [v for v in videos if v.name == want or v.stem == Path(want).stem]
        if not videos:
            logger.error("No inbox video matching %r.", args.video)
            return 1

    logger.info("=== Stage 2: analysis (%d candidate video(s)) ===", len(videos))
    done = sum(process_video(v, cfg, logger, args.force) for v in videos)
    logger.info("=== Analysis complete: %d video(s) processed ===", done)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
