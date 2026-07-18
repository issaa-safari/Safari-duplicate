"""Detect the OS and set up a scheduled pipeline run (cron or Task Scheduler).

    python scripts/schedule.py --show                  # print the schedule command
    python scripts/schedule.py --install               # install it
    python scripts/schedule.py --install --interval-hours 4
    python scripts/schedule.py --uninstall

The scheduled job runs `pipeline.py run`, which ingests + processes new videos
but never posts — publishing stays manual.
"""
from __future__ import annotations

import argparse
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TASK_NAME = "SafariVideoPipeline"


def venv_python() -> Path:
    win = ROOT / ".venv" / "Scripts" / "python.exe"
    nix = ROOT / ".venv" / "bin" / "python"
    return win if win.exists() else nix


def cron_line(interval_hours: int) -> str:
    py = venv_python()
    log = ROOT / "state" / "cron.log"
    return (f"0 */{interval_hours} * * * cd {ROOT} && {py} src/pipeline.py run "
            f">> {log} 2>&1")


def install_cron(interval_hours: int) -> int:
    line = cron_line(interval_hours)
    existing = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    current = existing.stdout if existing.returncode == 0 else ""
    kept = [ln for ln in current.splitlines() if "src/pipeline.py run" not in ln]
    kept.append(line)
    new = "\n".join(kept) + "\n"
    proc = subprocess.run(["crontab", "-"], input=new, text=True)
    if proc.returncode == 0:
        print(f"Installed cron job (every {interval_hours}h):\n  {line}")
        return 0
    print("Failed to install cron job.", file=sys.stderr)
    return 1


def uninstall_cron() -> int:
    existing = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    if existing.returncode != 0:
        print("No crontab to modify.")
        return 0
    kept = [ln for ln in existing.stdout.splitlines() if "src/pipeline.py run" not in ln]
    subprocess.run(["crontab", "-"], input="\n".join(kept) + "\n", text=True)
    print("Removed the pipeline cron job.")
    return 0


def schtasks_cmd(interval_hours: int) -> list[str]:
    py = venv_python()
    # /SC HOURLY /MO N runs every N hours.
    return ["schtasks", "/Create", "/TN", TASK_NAME, "/SC", "HOURLY", "/MO",
            str(interval_hours), "/TR",
            f'cmd /c cd /d "{ROOT}" && "{py}" src\\pipeline.py run', "/F"]


def install_windows(interval_hours: int) -> int:
    cmd = schtasks_cmd(interval_hours)
    proc = subprocess.run(cmd)
    if proc.returncode == 0:
        print(f"Installed Windows scheduled task '{TASK_NAME}' (every {interval_hours}h).")
        return 0
    print("Failed to create the scheduled task.", file=sys.stderr)
    return 1


def uninstall_windows() -> int:
    subprocess.run(["schtasks", "/Delete", "/TN", TASK_NAME, "/F"])
    return 0


def show(interval_hours: int) -> None:
    system = platform.system()
    print(f"Detected OS: {system}")
    if system == "Windows":
        print("Scheduled task command:\n  " + " ".join(schtasks_cmd(interval_hours)))
    else:
        print(f"Cron line (add via `crontab -e`):\n  {cron_line(interval_hours)}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Schedule the pipeline (OS-aware).")
    ap.add_argument("--interval-hours", type=int, default=2)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--show", action="store_true", help="Print the schedule command only.")
    g.add_argument("--install", action="store_true", help="Install the scheduled job.")
    g.add_argument("--uninstall", action="store_true", help="Remove the scheduled job.")
    args = ap.parse_args()

    system = platform.system()
    if args.install:
        return install_windows(args.interval_hours) if system == "Windows" \
            else install_cron(args.interval_hours)
    if args.uninstall:
        return uninstall_windows() if system == "Windows" else uninstall_cron()
    show(args.interval_hours)  # default is --show
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
