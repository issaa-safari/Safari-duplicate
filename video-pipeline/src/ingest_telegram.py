"""Telegram ingestion via Telethon (user API).

Connects with your api_id/api_hash, walks each configured chat/channel, and
downloads video messages that are new to the ledger. The first login is
interactive (Telegram sends a code to your app); after that the .session file
is reused non-interactively — which is what lets this run on a schedule.
"""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import common as C

from telethon import TelegramClient
from telethon.tl.types import (
    DocumentAttributeFilename,
    DocumentAttributeVideo,
    MessageMediaDocument,
)


def _is_video_message(msg, video_exts) -> bool:
    """True if the message carries a video document."""
    media = getattr(msg, "media", None)
    if not isinstance(media, MessageMediaDocument):
        return False
    doc = media.document
    if doc is None:
        return False
    for attr in doc.attributes:
        if isinstance(attr, DocumentAttributeVideo):
            return True
    # Fall back to filename extension / mime type.
    if (doc.mime_type or "").startswith("video/"):
        return True
    for attr in doc.attributes:
        if isinstance(attr, DocumentAttributeFilename):
            return C.is_video(attr.file_name, video_exts)
    return False


def _message_filename(msg, chat_label: str) -> str:
    """Best-effort original filename, else a stable synthetic one."""
    media = getattr(msg, "media", None)
    if isinstance(media, MessageMediaDocument) and media.document:
        for attr in media.document.attributes:
            if isinstance(attr, DocumentAttributeFilename):
                return attr.file_name
        ext = (media.document.mime_type or "video/mp4").split("/")[-1]
        return f"{chat_label}_{msg.id}.{ext}"
    return f"{chat_label}_{msg.id}.mp4"


async def _ingest_async(config: dict[str, Any], ledger: dict[str, Any], logger, dry_run: bool) -> int:
    tg = config.get("ingestion", {}).get("telegram", {})
    if not tg.get("enabled", False):
        logger.info("Telegram ingestion disabled in config — skipping.")
        return 0

    api_id = os.environ.get("TELEGRAM_API_ID")
    api_hash = os.environ.get("TELEGRAM_API_HASH")
    session = os.environ.get("TELEGRAM_SESSION", "safari_ingest")
    if not api_id or not api_hash:
        logger.error("TELEGRAM_API_ID / TELEGRAM_API_HASH not set in .env — skipping Telegram.")
        return 0

    video_exts = config["ingestion"]["video_extensions"]
    watch = tg.get("watch", []) or []
    lookback_days = int(tg.get("lookback_days", 0) or 0)
    min_date = None
    if lookback_days > 0:
        min_date = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    # Session file lives in state/ so it persists alongside the ledger.
    session_path = str(C.STATE_DIR / session)
    client = TelegramClient(session_path, int(api_id), api_hash)
    await client.start()  # interactive only on first run
    logger.info("Telegram: connected as session '%s'", session)

    new_count = 0
    try:
        for chat in watch:
            try:
                entity = await client.get_entity(chat)
            except Exception as exc:  # noqa: BLE001 - report and continue
                logger.error("Telegram: cannot resolve chat %r: %s", chat, exc)
                continue

            chat_label = C.safe_filename(str(chat).lstrip("@")) or "chat"
            logger.info("Telegram: scanning %s", chat)

            async for msg in client.iter_messages(entity):
                if min_date is not None and msg.date < min_date:
                    break  # messages are newest-first; older than window -> stop
                if not _is_video_message(msg, video_exts):
                    continue

                source_key = f"telegram:{chat}:{msg.id}"
                if C.source_seen(ledger, source_key):
                    continue

                fname = _message_filename(msg, chat_label)
                logger.info("Telegram: new video msg %s (%s)", msg.id, fname)
                if dry_run:
                    logger.info("  [dry-run] would download msg %s", msg.id)
                    new_count += 1
                    continue

                tmp = C.new_temp_file(suffix="_" + C.safe_filename(fname))
                try:
                    await client.download_media(msg, file=str(tmp))
                except Exception as exc:  # noqa: BLE001
                    logger.error("  download failed for msg %s: %s", msg.id, exc)
                    tmp.unlink(missing_ok=True)
                    continue

                dest = C.commit_ingested(ledger, tmp, source_key, fname, logger)
                C.ledger_save(ledger)
                if dest is not None:
                    new_count += 1
    finally:
        await client.disconnect()

    logger.info("Telegram: %d new file(s) ingested.", new_count)
    return new_count


def ingest(config: dict[str, Any], ledger: dict[str, Any], logger, dry_run: bool = False) -> int:
    return asyncio.run(_ingest_async(config, ledger, logger, dry_run))
