"""Shared foundation for the video pipeline: paths, config, logging, and the
ingestion ledger used to skip already-downloaded files.

Every stage imports from here so there is a single source of truth for where
things live and how we decide a file is "already seen".
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any, Iterable

import yaml
from dotenv import load_dotenv

# --------------------------------------------------------------------------- #
# Paths — everything is relative to the video-pipeline/ directory.
# --------------------------------------------------------------------------- #
PIPELINE_ROOT = Path(__file__).resolve().parent.parent

INBOX_DIR = PIPELINE_ROOT / "inbox"
WORK_DIR = PIPELINE_ROOT / "work"
OUTPUT_DIR = PIPELINE_ROOT / "output"
MUSIC_DIR = PIPELINE_ROOT / "assets" / "music"
STATE_DIR = PIPELINE_ROOT / "state"

LEDGER_PATH = STATE_DIR / "ingest_ledger.json"
LOG_PATH = STATE_DIR / "pipeline.log"
CONFIG_PATH = PIPELINE_ROOT / "config.yaml"
ENV_PATH = PIPELINE_ROOT / ".env"

for _d in (INBOX_DIR, WORK_DIR, OUTPUT_DIR, MUSIC_DIR, STATE_DIR):
    _d.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------------------------------- #
# Config & environment
# --------------------------------------------------------------------------- #
def load_env() -> None:
    """Load .env into os.environ (no-op if the file is absent)."""
    if ENV_PATH.exists():
        load_dotenv(ENV_PATH)


def load_config() -> dict[str, Any]:
    """Load config.yaml, falling back to config.example.yaml with a warning."""
    path = CONFIG_PATH
    if not path.exists():
        example = PIPELINE_ROOT / "config.example.yaml"
        if example.exists():
            logging.getLogger("pipeline").warning(
                "config.yaml not found — using config.example.yaml. "
                "Copy it to config.yaml and edit before real use."
            )
            path = example
        else:
            raise FileNotFoundError("No config.yaml or config.example.yaml found.")
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


# --------------------------------------------------------------------------- #
# Logging — to console and to state/pipeline.log
# --------------------------------------------------------------------------- #
def get_logger(name: str = "pipeline") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:  # already configured
        return logger
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s  %(levelname)-7s  %(name)s: %(message)s",
                            datefmt="%Y-%m-%d %H:%M:%S")

    console = logging.StreamHandler()
    console.setFormatter(fmt)
    logger.addHandler(console)

    fileh = logging.FileHandler(LOG_PATH, encoding="utf-8")
    fileh.setFormatter(fmt)
    logger.addHandler(fileh)
    return logger


# --------------------------------------------------------------------------- #
# Filenames
# --------------------------------------------------------------------------- #
_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]+")


def safe_filename(name: str) -> str:
    """Make a filesystem-safe filename, preserving the extension."""
    name = name.strip().replace(" ", "_")
    stem, dot, ext = name.rpartition(".")
    if dot:
        stem = _SAFE_RE.sub("_", stem).strip("_") or "video"
        ext = _SAFE_RE.sub("", ext)
        return f"{stem}.{ext}"
    return _SAFE_RE.sub("_", name).strip("_") or "video"


def unique_inbox_path(filename: str) -> Path:
    """Return an inbox path, appending _1, _2, ... if the name already exists."""
    filename = safe_filename(filename)
    candidate = INBOX_DIR / filename
    if not candidate.exists():
        return candidate
    stem = candidate.stem
    ext = candidate.suffix
    i = 1
    while (INBOX_DIR / f"{stem}_{i}{ext}").exists():
        i += 1
    return INBOX_DIR / f"{stem}_{i}{ext}"


def is_video(path: str | Path, video_exts: Iterable[str]) -> bool:
    return Path(path).suffix.lower() in {e.lower() for e in video_exts}


# --------------------------------------------------------------------------- #
# Ledger — records what we have already ingested so we never re-download.
#
# Two independent guards:
#   * source keys  — e.g. "telegram:@chan:4821" or "onedrive:SafariVideos/a.mp4"
#                    Cheap to check, avoids re-downloading from the source at all.
#   * content hash — sha256 of the file bytes. Catches the same clip arriving
#                    from two different sources (Telegram *and* OneDrive).
# --------------------------------------------------------------------------- #
def _empty_ledger() -> dict[str, Any]:
    return {"version": 1, "sources": {}, "hashes": {}}


def ledger_load() -> dict[str, Any]:
    if LEDGER_PATH.exists():
        try:
            with LEDGER_PATH.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
            data.setdefault("sources", {})
            data.setdefault("hashes", {})
            return data
        except (json.JSONDecodeError, OSError):
            get_logger().warning("Ledger unreadable; starting a fresh one.")
    return _empty_ledger()


def ledger_save(ledger: dict[str, Any]) -> None:
    """Write atomically so a crash mid-write can't corrupt the ledger."""
    tmp = LEDGER_PATH.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(ledger, fh, indent=2, ensure_ascii=False)
    tmp.replace(LEDGER_PATH)


def source_seen(ledger: dict[str, Any], key: str) -> bool:
    return key in ledger["sources"]


def sha256_file(path: str | Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def commit_ingested(
    ledger: dict[str, Any],
    tmp_file: str | Path,
    source_key: str,
    desired_name: str,
    logger: logging.Logger,
) -> Path | None:
    """Finalize one downloaded file.

    Given a fully-downloaded temp file, hash it. If the content is new, move it
    into the inbox and record both the source key and the hash. If the content
    was already ingested (from any source), discard the temp file and just
    record the source key so we don't fetch it again. Returns the inbox Path on
    a genuinely new file, else None.
    """
    tmp_file = Path(tmp_file)
    digest = sha256_file(tmp_file)

    if digest in ledger["hashes"]:
        existing = ledger["hashes"][digest]
        logger.info("Duplicate content (already have %s) — skipping %s", existing, source_key)
        ledger["sources"][source_key] = {"duplicate_of": existing, "sha256": digest}
        tmp_file.unlink(missing_ok=True)
        return None

    dest = unique_inbox_path(desired_name)
    shutil.move(str(tmp_file), str(dest))
    ledger["hashes"][digest] = dest.name
    ledger["sources"][source_key] = {"file": dest.name, "sha256": digest}
    logger.info("Ingested %s  ->  inbox/%s", source_key, dest.name)
    return dest


def new_temp_file(suffix: str = "") -> Path:
    """A temp path inside state/ (same filesystem as inbox, so move is atomic)."""
    fd, name = tempfile.mkstemp(prefix="dl_", suffix=suffix, dir=str(STATE_DIR))
    os.close(fd)
    return Path(name)
