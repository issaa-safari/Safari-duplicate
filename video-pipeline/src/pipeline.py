"""Stage 6 — orchestrator. Runs the whole flow on only-new work and logs progress.

    python src/pipeline.py            # run the full flow (never auto-posts)
    python src/pipeline.py status     # show where every video is in the pipeline

Flow per run:
  1. ingest      new videos from Telegram + OneDrive -> inbox/
  2. analyze     keyframes + scenes + optional speech -> work/<name>/
  3. request     SCRIPT_REQUEST.md for anything not yet scripted
  4. edit        any video that now has a script.json -> output/<name>/
  5. prepare     READY_TO_PUBLISH.md for anything exported

Publishing stays manual (`./publish <name>`), so nothing goes live unattended.
Every stage is idempotent — already-done work is skipped — so this is safe to
run on a schedule.
"""
from __future__ import annotations

import argparse
import json

import common as C
import ingest_telegram
import ingest_onedrive
import analyze
import script_request
import edit
import publish


def _stage(logger, n: int, title: str) -> None:
    logger.info("──────── [%d/5] %s ────────", n, title)


def run(config: dict, logger) -> None:
    logger.info("════════ pipeline run ════════")

    # 1) INGEST
    _stage(logger, 1, "ingest")
    ledger = C.ledger_load()
    try:
        ingest_telegram.ingest(config, ledger, logger, dry_run=False)
        ingest_onedrive.ingest(config, ledger, logger, dry_run=False)
    except Exception as exc:  # noqa: BLE001
        logger.error("ingest error: %s", exc)
    C.ledger_save(ledger)

    # 2) ANALYZE
    _stage(logger, 2, "analyze")
    acfg = analyze.load_analysis_cfg(config)
    for v in analyze.find_inbox_videos(config):
        try:
            analyze.process_video(v, acfg, logger, force=False)
        except Exception as exc:  # noqa: BLE001
            logger.error("analyze error on %s: %s", v.name, exc)

    # 3) SCRIPT REQUESTS
    _stage(logger, 3, "script requests")
    for d in sorted(p for p in C.WORK_DIR.iterdir() if p.is_dir()):
        try:
            if script_request.needs_request(d, force=False):
                script_request.generate(d, logger)
        except Exception as exc:  # noqa: BLE001
            logger.error("script-request error on %s: %s", d.name, exc)

    # 4) EDIT (only videos that now have a script.json)
    _stage(logger, 4, "edit")
    for d in sorted(p for p in C.WORK_DIR.iterdir() if p.is_dir()):
        if not (d / "script.json").exists():
            continue
        out_dir = C.OUTPUT_DIR / d.name
        if out_dir.exists() and any(out_dir.glob("*.mp4")):
            continue  # already exported
        try:
            edit.edit_one(d.name, config, ["16x9", "9x16"], logger, force=False)
        except Exception as exc:  # noqa: BLE001
            logger.error("edit error on %s: %s", d.name, exc)

    # 5) PREPARE PUBLISH SUMMARIES (never posts)
    _stage(logger, 5, "prepare publish summaries")
    for d in sorted(p for p in C.OUTPUT_DIR.iterdir() if p.is_dir()):
        if any(d.glob("*.mp4")):
            try:
                publish.prepare(d.name, config, logger)
            except Exception as exc:  # noqa: BLE001
                logger.error("prepare error on %s: %s", d.name, exc)

    logger.info("════════ run complete ════════")
    status(config, logger)


def _flag(cond: bool) -> str:
    return "✔" if cond else "·"


def status(config: dict, logger) -> None:
    """Print a per-video state table."""
    dirs = sorted(p for p in C.WORK_DIR.iterdir() if p.is_dir())
    if not dirs:
        logger.info("No videos in the pipeline yet. Run ingest first.")
        return

    print("\n  video                          analyze  script  edit  published   next step")
    print("  " + "-" * 82)
    for d in dirs:
        meta = {}
        mp = d / "metadata.json"
        if mp.exists():
            try:
                meta = json.loads(mp.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                pass
        stages = meta.get("stages", {})
        analyzed = stages.get("analyze") == "done"
        has_script = (d / "script.json").exists()
        out_dir = C.OUTPUT_DIR / d.name
        edited = out_dir.exists() and any(out_dir.glob("*.mp4"))
        published = stages.get("publish") == "done"

        if not analyzed:
            nxt = "analyze"
        elif not has_script:
            nxt = "DROP script.json (see SCRIPT_REQUEST.md)"
        elif not edited:
            nxt = "edit"
        elif not published:
            nxt = f"./publish {d.name}"
        else:
            nxt = "done"

        print(f"  {d.name[:30]:30}   {_flag(analyzed):^5}   {_flag(has_script):^4}  "
              f"{_flag(edited):^4}   {_flag(published):^7}    {nxt}")
    print()


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage 6: run the whole pipeline")
    parser.add_argument("command", nargs="?", default="run", choices=["run", "status"])
    args = parser.parse_args()

    C.load_env()
    logger = C.get_logger()
    config = C.load_config()

    if args.command == "status":
        status(config, logger)
    else:
        run(config, logger)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
