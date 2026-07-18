# Safari Video Pipeline — convenience targets (Linux/macOS).
# On Windows use the .cmd wrappers or call .venv\Scripts\python src\<stage>.py directly.

PY := .venv/bin/python

.PHONY: help setup run status ingest analyze script edit prepare publish \
        schedule-show schedule-install schedule-uninstall clean

help:
	@echo "Safari Video Pipeline"
	@echo "  make setup               create venv + install dependencies"
	@echo "  make run                 run the whole flow on new videos (never posts)"
	@echo "  make status              show where each video is in the pipeline"
	@echo "  make ingest|analyze|script|edit|prepare   run a single stage"
	@echo "  make publish VIDEO=name  publish one video to Blotato (opt-in)"
	@echo "  make schedule-show       print the OS-appropriate schedule command"
	@echo "  make schedule-install    install a scheduled run (cron / Task Scheduler)"

setup:
	python3 -m venv .venv
	$(PY) -m pip install -U pip
	$(PY) -m pip install -r requirements.txt
	@test -f config.yaml || cp config.example.yaml config.yaml
	@test -f .env || cp .env.example .env
	@echo "Setup done. Edit .env and config.yaml, then: make run"

run:
	$(PY) src/pipeline.py run

status:
	$(PY) src/pipeline.py status

ingest:
	$(PY) src/ingest.py

analyze:
	$(PY) src/analyze.py

script:
	$(PY) src/script_request.py

edit:
	$(PY) src/edit.py

prepare:
	$(PY) src/publish.py prepare

publish:
	@test -n "$(VIDEO)" || (echo "usage: make publish VIDEO=<video_name>"; exit 1)
	$(PY) src/publish.py post $(VIDEO)

schedule-show:
	$(PY) scripts/schedule.py --show

schedule-install:
	$(PY) scripts/schedule.py --install

schedule-uninstall:
	$(PY) scripts/schedule.py --uninstall

clean:
	rm -rf work/*/_edit_tmp state/dl_* 2>/dev/null || true
