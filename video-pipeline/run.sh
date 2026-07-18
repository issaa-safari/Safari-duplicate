#!/usr/bin/env bash
# Run the whole pipeline once (ingest -> analyze -> request -> edit -> prepare).
cd "$(dirname "$0")"
exec .venv/bin/python src/pipeline.py "${1:-run}"
