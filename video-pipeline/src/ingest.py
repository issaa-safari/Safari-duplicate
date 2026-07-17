"""Stage 1 orchestrator — pull new videos from all configured sources into inbox/.

Usage:
    python src/ingest.py [--source all|telegram|onedrive] [--dry-run]

Both sources drop into the single ./inbox folder and skip files already
recorded in state/ingest_ledger.json (by source id and by content hash).
"""
from __future__ import annotations

import argparse

import common as C
import ingest_onedrive
import ingest_telegram


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage 1: ingest new videos into inbox/")
    parser.add_argument("--source", choices=["all", "telegram", "onedrive"], default="all")
    parser.add_argument("--dry-run", action="store_true",
                        help="List what would be downloaded without downloading.")
    args = parser.parse_args()

    C.load_env()
    logger = C.get_logger()
    config = C.load_config()
    ledger = C.ledger_load()

    logger.info("=== Stage 1: ingestion (source=%s%s) ===",
                args.source, ", dry-run" if args.dry_run else "")

    total = 0
    if args.source in ("all", "telegram"):
        total += ingest_telegram.ingest(config, ledger, logger, args.dry_run)
    if args.source in ("all", "onedrive"):
        total += ingest_onedrive.ingest(config, ledger, logger, args.dry_run)

    C.ledger_save(ledger)
    logger.info("=== Ingestion complete: %d new file(s) in inbox/ ===", total)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
