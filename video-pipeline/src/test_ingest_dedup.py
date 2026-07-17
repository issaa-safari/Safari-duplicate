"""Offline smoke test for the ingestion dedup logic (no network needed).

Simulates files arriving from OneDrive and Telegram and asserts that:
  1. genuinely new content lands in the inbox and is recorded,
  2. the same source key is never fetched twice,
  3. identical *content* from a different source is deduped by hash,
  4. different content is treated as new.

Run:  ./.venv/bin/python src/test_ingest_dedup.py <dir-with-clipA.mp4-clipB.mp4-clipA_copy.mp4>
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import common as C


def _fake_download(src: Path) -> Path:
    """Copy a source file to a temp file, mimicking a real download."""
    tmp = C.new_temp_file(suffix="_" + src.name)
    shutil.copy(src, tmp)
    return tmp


def main(clips: Path) -> int:
    logger = C.get_logger("test")
    ledger = C._empty_ledger()  # isolated in-memory ledger for the test

    clipA = clips / "clipA.mp4"
    clipB = clips / "clipB.mp4"
    clipA_copy = clips / "clipA_copy.mp4"
    for p in (clipA, clipB, clipA_copy):
        assert p.exists(), f"missing test clip: {p}"

    failures = []

    def check(label, cond):
        print(f"  [{'PASS' if cond else 'FAIL'}] {label}")
        if not cond:
            failures.append(label)

    print("1) OneDrive delivers clipA (new content)")
    key = "onedrive:test:clipA.mp4"
    dest = C.commit_ingested(ledger, _fake_download(clipA), key, "clipA.mp4", logger)
    check("clipA landed in inbox", dest is not None and dest.exists())
    check("source key recorded", C.source_seen(ledger, key))
    check("content hash recorded", len(ledger["hashes"]) == 1)

    print("2) OneDrive run again — same source key already seen")
    check("source_seen short-circuits re-download", C.source_seen(ledger, key))

    print("3) Telegram delivers the SAME clip (clipA_copy) under a new source key")
    key2 = "telegram:@chan:101"
    n_inbox_before = len(list(C.INBOX_DIR.glob("clip*")))
    dest2 = C.commit_ingested(ledger, _fake_download(clipA_copy), key2, "from_telegram.mp4", logger)
    check("duplicate content NOT re-added to inbox", dest2 is None)
    check("new source key still recorded (won't refetch)", C.source_seen(ledger, key2))
    check("marked as duplicate_of", ledger["sources"][key2].get("duplicate_of") is not None)
    check("inbox count unchanged", len(list(C.INBOX_DIR.glob("clip*"))) == n_inbox_before)

    print("4) Telegram delivers clipB (genuinely different content)")
    key3 = "telegram:@chan:102"
    dest3 = C.commit_ingested(ledger, _fake_download(clipB), key3, "clipB.mp4", logger)
    check("clipB landed in inbox", dest3 is not None and dest3.exists())
    check("two distinct hashes tracked", len(ledger["hashes"]) == 2)

    print("5) Filename collision handling")
    key4 = "onedrive:test:sub/clipB.mp4"
    # Different bytes but same desired name -> should get a _1 suffix, not clobber.
    tmp = C.new_temp_file(suffix="_clipB.mp4")
    with open(tmp, "wb") as fh:
        fh.write(b"totally different bytes " * 100)
    dest4 = C.commit_ingested(ledger, tmp, key4, "clipB.mp4", logger)
    check("collision got a suffixed name", dest4 is not None and dest4.name != "clipB.mp4")

    # cleanup inbox test artifacts
    for p in C.INBOX_DIR.glob("clip*"):
        p.unlink()

    print()
    if failures:
        print(f"RESULT: {len(failures)} FAILURE(S): {failures}")
        return 1
    print("RESULT: all dedup checks passed ✔")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(Path(sys.argv[1])))
