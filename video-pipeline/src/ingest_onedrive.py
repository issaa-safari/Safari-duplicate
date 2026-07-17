"""OneDrive ingestion via rclone.

We don't just `rclone copy` into the inbox, because that would bypass our
content-hash dedup (a clip that also came via Telegram would land twice).
Instead we list the remote with `rclone lsjson`, pick the files whose source
key is new to the ledger, download each to a temp file, and hand it to
common.commit_ingested() — which moves it into the inbox only if the content
is genuinely new.
"""
from __future__ import annotations

import json
import subprocess
from typing import Any

import common as C


def _rclone(args: list[str], logger, capture: bool = True) -> subprocess.CompletedProcess:
    cmd = ["rclone", *args]
    logger.debug("rclone %s", " ".join(args))
    return subprocess.run(cmd, capture_output=capture, text=True)


def rclone_available() -> bool:
    try:
        subprocess.run(["rclone", "version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def list_remote_videos(remote: str, path: str, video_exts, logger) -> list[dict[str, Any]]:
    """Return lsjson entries for video files under remote:path (recursive)."""
    target = f"{remote}:{path}" if path else f"{remote}:"
    proc = _rclone(["lsjson", "-R", "--files-only", target], logger)
    if proc.returncode != 0:
        logger.error("rclone lsjson failed for %s:\n%s", target, proc.stderr.strip())
        return []
    try:
        entries = json.loads(proc.stdout or "[]")
    except json.JSONDecodeError:
        logger.error("Could not parse rclone lsjson output.")
        return []
    return [e for e in entries if C.is_video(e.get("Path", ""), video_exts)]


def ingest(config: dict[str, Any], ledger: dict[str, Any], logger, dry_run: bool = False) -> int:
    od = config.get("ingestion", {}).get("onedrive", {})
    if not od.get("enabled", False):
        logger.info("OneDrive ingestion disabled in config — skipping.")
        return 0
    if not rclone_available():
        logger.error("rclone not found on PATH. Install it and configure the remote (see README).")
        return 0

    remote = od.get("remote", "onedrive")
    path = od.get("path", "")
    video_exts = config["ingestion"]["video_extensions"]

    entries = list_remote_videos(remote, path, video_exts, logger)
    logger.info("OneDrive: %d video file(s) found under %s:%s", len(entries), remote, path or "/")

    new_count = 0
    for e in entries:
        rel = e["Path"]
        source_key = f"onedrive:{remote}:{path}/{rel}".replace("//", "/")
        if C.source_seen(ledger, source_key):
            continue

        base = path + "/" + rel if path else rel
        remote_file = f"{remote}:{base}"
        logger.info("OneDrive: downloading %s", rel)
        if dry_run:
            logger.info("  [dry-run] would download %s", remote_file)
            new_count += 1
            continue

        tmp = C.new_temp_file(suffix="_" + C.safe_filename(rel.split("/")[-1]))
        proc = _rclone(["copyto", remote_file, str(tmp)], logger)
        if proc.returncode != 0:
            logger.error("  download failed: %s", proc.stderr.strip())
            tmp.unlink(missing_ok=True)
            continue

        dest = C.commit_ingested(ledger, tmp, source_key, rel.split("/")[-1], logger)
        C.ledger_save(ledger)
        if dest is not None:
            new_count += 1

    logger.info("OneDrive: %d new file(s) ingested.", new_count)
    return new_count
