"""Stage 5 — publish via Blotato (opt-in).

Nothing here posts automatically. The pipeline calls `prepare`, which only writes
output/<name>/READY_TO_PUBLISH.md. You publish deliberately:

    ./publish <name>                     # convenience wrapper -> `post`
    python src/publish.py post <name>            # publish everywhere configured
    python src/publish.py post <name> --platforms instagram,tiktok
    python src/publish.py post <name> --schedule 2026-08-01T09:00:00Z
    python src/publish.py post <name> --dry-run  # show requests, send nothing

Blotato REST API: base https://backend.blotato.com, header `blotato-api-key`.
Your key lives in .env as BLOTATO_API_KEY (never in code).
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

import common as C
import script_io

BASE_URL = "https://backend.blotato.com"

# platform -> content-type for the presigned PUT upload
_CT = {".mp4": "video/mp4", ".mov": "video/quicktime", ".jpg": "image/jpeg", ".png": "image/png"}


class BlotatoError(RuntimeError):
    pass


class BlotatoClient:
    def __init__(self, api_key: str):
        self.s = requests.Session()
        self.s.headers.update({"blotato-api-key": api_key, "Content-Type": "application/json"})

    def list_accounts(self) -> list[dict[str, Any]]:
        r = self.s.get(f"{BASE_URL}/v2/users/me/accounts", timeout=30)
        if r.status_code != 200:
            raise BlotatoError(f"list accounts failed ({r.status_code}): {r.text[:300]}")
        return r.json().get("items", [])

    def upload_local_file(self, path: Path, logger) -> str:
        """Presigned-URL upload of a local file; returns the public URL."""
        r = self.s.post(f"{BASE_URL}/v2/media/uploads",
                        json={"filename": path.name}, timeout=30)
        if r.status_code not in (200, 201):
            raise BlotatoError(f"create upload url failed ({r.status_code}): {r.text[:300]}")
        data = r.json()
        presigned, public = data["presignedUrl"], data["publicUrl"]
        ct = _CT.get(path.suffix.lower(), "application/octet-stream")
        logger.info("    uploading %s (%.1f MB)...", path.name, path.stat().st_size / 1e6)
        put = requests.put(presigned, data=path.read_bytes(),
                           headers={"Content-Type": ct}, timeout=600)
        if put.status_code not in (200, 201, 204):
            raise BlotatoError(f"file PUT failed ({put.status_code}): {put.text[:200]}")
        return public

    def create_post(self, body: dict[str, Any]) -> dict[str, Any]:
        r = self.s.post(f"{BASE_URL}/v2/posts", json=body, timeout=60)
        if r.status_code not in (200, 201):
            raise BlotatoError(f"create post failed ({r.status_code}): {r.text[:400]}")
        return r.json()


# --------------------------------------------------------------------------- #
# Building the post body per platform
# --------------------------------------------------------------------------- #
def build_target(platform: str, tcfg: dict[str, Any], title: str, account: dict[str, Any]) -> dict[str, Any]:
    target: dict[str, Any] = {"targetType": platform}
    if platform == "tiktok":
        target["privacyLevel"] = tcfg.get("privacy_level", "SELF_ONLY")
        target["isAiGenerated"] = bool(tcfg.get("is_ai_generated", True))
        for k in ("disabledComments", "disabledDuet", "disabledStitch"):
            target[k] = False
    elif platform == "youtube":
        target["title"] = title or "Safari Adventure Riders"
        target["privacyStatus"] = tcfg.get("privacy_status", "private")
        target["shouldNotifySubscribers"] = False
    elif platform == "instagram":
        target["mediaType"] = tcfg.get("media_type", "reel")
    elif platform == "facebook":
        page_id = tcfg.get("page_id") or _first_subaccount_id(account)
        if page_id:
            target["pageId"] = page_id
        if tcfg.get("media_type"):
            target["mediaType"] = tcfg["media_type"]
    elif platform == "linkedin":
        if tcfg.get("page_id"):
            target["pageId"] = tcfg["page_id"]
    return target


def _first_subaccount_id(account: dict[str, Any]) -> str | None:
    subs = account.get("subaccounts") or account.get("pages") or []
    if subs and isinstance(subs, list):
        return subs[0].get("id") or subs[0].get("pageId")
    return None


def build_post_body(platform: str, account_id: str, text: str, media_url: str,
                    target: dict[str, Any], schedule: str | None) -> dict[str, Any]:
    body: dict[str, Any] = {
        "post": {
            "accountId": account_id,
            "content": {"text": text, "mediaUrls": [media_url], "platform": platform},
            "target": target,
        }
    }
    if schedule:
        body["scheduledTime"] = schedule
    return body


# --------------------------------------------------------------------------- #
# prepare (safe default) and post (explicit)
# --------------------------------------------------------------------------- #
def prepare(name: str, config: dict[str, Any], logger) -> bool:
    out_dir = C.OUTPUT_DIR / C.safe_filename(name)
    work_dir = C.WORK_DIR / C.safe_filename(name)
    script, errors = script_io.load_and_validate(work_dir)
    if errors:
        logger.error("Cannot prepare '%s': %s", name, "; ".join(errors))
        return False
    if not out_dir.exists() or not any(out_dir.glob("*.mp4")):
        logger.error("Cannot prepare '%s': no exported videos in output/ (run Stage 4).", name)
        return False

    targets = (config.get("publish", {}) or {}).get("targets", {}) or {}
    post_caps = script.get("post_captions", {})
    exports = {p.name.rsplit("_", 1)[-1].replace(".mp4", ""): p.name for p in out_dir.glob("*.mp4")}

    lines = [f"# Ready to publish — `{name}`", "",
             f"**Title:** {script.get('title', '(none)')}", "",
             "Exported videos:"]
    for fmt, fname in sorted(exports.items()):
        lines.append(f"- `{fname}`  ({fmt})")
    lines += ["", "## Planned posts", ""]
    planned = []
    for platform, tcfg in targets.items():
        cap = post_caps.get(platform)
        fmt = tcfg.get("format", "9x16")
        has_export = fmt in exports
        status = "ready" if (cap and has_export) else \
                 ("no caption" if not cap else f"no {fmt} export")
        lines.append(f"### {platform}  —  _{status}_")
        lines.append(f"- format: **{fmt}** (`{exports.get(fmt, 'MISSING')}`)")
        lines.append(f"- caption:\n\n  > {(cap or '(none)').replace(chr(10), ' ')}\n")
        if cap and has_export:
            planned.append(platform)
    lines += ["---", "",
              "Nothing has been posted. To publish, run:", "",
              "```bash", f"./publish {name}", "```", "",
              f"That will post to: **{', '.join(planned) if planned else '(none ready)'}**.",
              "Add `--dry-run` to preview the exact API calls first."]

    (out_dir / "READY_TO_PUBLISH.md").write_text("\n".join(lines), encoding="utf-8")
    logger.info("Wrote output/%s/READY_TO_PUBLISH.md (%d platform(s) ready: %s)",
                C.safe_filename(name), len(planned), ", ".join(planned) or "none")
    return True


def post(name: str, config: dict[str, Any], logger, only: list[str] | None,
         schedule: str | None, dry_run: bool) -> bool:
    out_dir = C.OUTPUT_DIR / C.safe_filename(name)
    work_dir = C.WORK_DIR / C.safe_filename(name)
    script, errors = script_io.load_and_validate(work_dir)
    if errors:
        logger.error("script.json invalid: %s", "; ".join(errors))
        return False

    targets = (config.get("publish", {}) or {}).get("targets", {}) or {}
    post_caps = script.get("post_captions", {})
    title = script.get("title", "")
    exports = {p.name.rsplit("_", 1)[-1].replace(".mp4", ""): p for p in out_dir.glob("*.mp4")}

    plan = []
    for platform, tcfg in targets.items():
        if only and platform not in only:
            continue
        cap = post_caps.get(platform)
        fmt = tcfg.get("format", "9x16")
        if not cap:
            logger.info("  skip %s: no caption in post_captions.", platform)
            continue
        if fmt not in exports:
            logger.warning("  skip %s: no %s export.", platform, fmt)
            continue
        plan.append((platform, tcfg, cap, exports[fmt]))

    if not plan:
        logger.error("Nothing to post for '%s' (check captions/exports/targets).", name)
        return False

    api_key = os.environ.get("BLOTATO_API_KEY")
    if not api_key and not dry_run:
        logger.error("BLOTATO_API_KEY not set in .env — cannot post. (Try --dry-run.)")
        return False

    client = BlotatoClient(api_key) if not dry_run else None
    accounts = client.list_accounts() if client else []
    by_platform: dict[str, dict[str, Any]] = {}
    for a in accounts:
        by_platform.setdefault(a.get("platform"), a)  # first account per platform

    uploaded: dict[Path, str] = {}
    results = []
    for platform, tcfg, cap, video in plan:
        account = by_platform.get(platform)
        if not account and not dry_run:
            logger.warning("  skip %s: no connected Blotato account for this platform.", platform)
            continue
        account_id = account["id"] if account else f"<{platform}-account-id>"
        target = build_target(platform, tcfg, title, account or {})

        # upload once per distinct file
        if dry_run:
            media_url = f"<public-url-for-{video.name}>"
        else:
            if video not in uploaded:
                uploaded[video] = client.upload_local_file(video, logger)
            media_url = uploaded[video]

        body = build_post_body(platform, account_id, cap, media_url, target, schedule)
        if dry_run:
            logger.info("  [dry-run] POST /v2/posts for %s:\n%s", platform,
                        json.dumps(body, indent=2, ensure_ascii=False))
            results.append({"platform": platform, "dry_run": True})
            continue

        logger.info("  posting to %s...", platform)
        try:
            resp = client.create_post(body)
            pid = resp.get("id") or resp.get("postSubmissionId") or "(submitted)"
            logger.info("    ✔ %s: %s", platform, pid)
            results.append({"platform": platform, "id": pid, "scheduled": schedule})
        except BlotatoError as exc:
            logger.error("    x %s failed: %s", platform, exc)
            results.append({"platform": platform, "error": str(exc)})

    if not dry_run:
        meta_path = work_dir / "metadata.json"
        meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
        meta.setdefault("stages", {})["publish"] = "done"
        meta.setdefault("publish_log", []).append(
            {"at": datetime.now(timezone.utc).isoformat(), "schedule": schedule, "results": results})
        meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage 5: publish via Blotato (opt-in)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_prep = sub.add_parser("prepare", help="Write READY_TO_PUBLISH.md (no posting).")
    p_prep.add_argument("video", nargs="?", help="Video name (default: all exported).")

    p_post = sub.add_parser("post", help="Actually publish to Blotato.")
    p_post.add_argument("video")
    p_post.add_argument("--platforms", help="Comma list to limit (e.g. instagram,tiktok).")
    p_post.add_argument("--schedule", help="ISO 8601 time to schedule instead of posting now.")
    p_post.add_argument("--dry-run", action="store_true", help="Show requests, send nothing.")
    args = parser.parse_args()

    C.load_env()
    logger = C.get_logger()
    config = C.load_config()

    if args.cmd == "prepare":
        if args.video:
            names = [args.video]
        else:
            names = [d.name for d in sorted(C.OUTPUT_DIR.iterdir())
                     if d.is_dir() and any(d.glob("*.mp4"))]
        ok = all(prepare(n, config, logger) for n in names) if names else True
        if not names:
            logger.info("No exported videos to prepare.")
        return 0 if ok else 1

    only = [p.strip() for p in args.platforms.split(",")] if args.platforms else None
    logger.info("=== Stage 5: publish '%s'%s ===", args.video, " (dry-run)" if args.dry_run else "")
    return 0 if post(args.video, config, logger, only, args.schedule, args.dry_run) else 1


if __name__ == "__main__":
    raise SystemExit(main())
