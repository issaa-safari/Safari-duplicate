"""Load and validate work/<video_name>/script.json against the schema plus a
few semantic checks FFmpeg would otherwise choke on later.

Used by Stage 3 (to check a drop) and Stage 4 (to gate the edit).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import common as C

SCHEMA_PATH = C.PIPELINE_ROOT / "schema" / "script.schema.json"


def load_schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def validate_script(script: dict[str, Any], meta: dict[str, Any] | None = None) -> list[str]:
    """Return a list of human-readable problems ([] means valid)."""
    errors: list[str] = []

    # 1) JSON Schema structure
    try:
        import jsonschema
        validator = jsonschema.Draft7Validator(load_schema())
        for e in sorted(validator.iter_errors(script), key=lambda e: e.path):
            loc = "/".join(str(p) for p in e.path) or "(root)"
            errors.append(f"{loc}: {e.message}")
    except ModuleNotFoundError:
        errors.append("jsonschema not installed — run: pip install jsonschema")
        return errors

    if errors:
        return errors  # structural errors first; semantic checks assume shape is ok

    # 2) Semantic checks
    duration = None
    if meta:
        duration = (meta.get("probe") or {}).get("duration")

    for i, seg in enumerate(script.get("keep_segments", [])):
        start, end = seg["start"], seg["end"]
        if end <= start:
            errors.append(f"keep_segments[{i}]: end ({end}) must be greater than start ({start}).")
        if duration is not None and end > duration + 0.5:
            errors.append(f"keep_segments[{i}]: end ({end}s) exceeds video duration ({duration}s).")

    if meta and script.get("video_name") and script["video_name"] != meta.get("video_name"):
        errors.append(
            f"video_name '{script['video_name']}' does not match this folder "
            f"('{meta.get('video_name')}')."
        )

    if not script.get("post_captions"):
        errors.append("post_captions is empty — add at least one platform caption.")

    return errors


def load_and_validate(work_dir: Path) -> tuple[dict[str, Any] | None, list[str]]:
    script_path = work_dir / "script.json"
    if not script_path.exists():
        return None, [f"No script.json in {work_dir}"]
    try:
        script = json.loads(script_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return None, [f"script.json is not valid JSON: {exc}"]

    meta = None
    meta_path = work_dir / "metadata.json"
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            meta = None

    return script, validate_script(script, meta)
