"""Start SplitPay locally: the API (port 8000) and the web app (port 5173).

Usage:
    python run/run.py        # API and web app
    python run/run.py api    # API only
    python run/run.py web    # web app only

On the first start it creates backend/.venv, installs requirements.txt and runs
npm install; later starts reinstall only when requirements.txt or package-lock.json changes.
Press Ctrl+C to stop.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

# run.py lives in run/, so the repository root is one level up.
ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


MIN_PYTHON = (3, 12)
REQUIREMENTS = ROOT / "requirements.txt"
VENV = BACKEND / ".venv"
# Written after a successful install, so later starts skip pip unless requirements change.
INSTALLED_MARK = VENV / ".requirements-installed"


def venv_python() -> Path | None:
    for candidate in ("bin/python", "Scripts/python.exe"):
        path = VENV / candidate
        if path.exists():
            return path
    return None


def base_python() -> str:
    """A Python 3.12+ to create the venv with: this one, or python3.13/3.12 on PATH."""
    if sys.version_info >= MIN_PYTHON:
        return sys.executable
    for name in ("python3.13", "python3.12"):
        found = shutil.which(name)
        if found:
            return found
    sys.exit("Python 3.12 or newer is required for the API. Install it (python.org or Homebrew) and try again.")


def run_step(message: str, command: list[str], cwd: Path) -> None:
    print(message)
    if subprocess.run(command, cwd=cwd).returncode != 0:
        sys.exit(f"Failed: {' '.join(command)}")


def prepare_api() -> Path:
    if venv_python() is None:
        run_step("Creating backend/.venv...", [base_python(), "-m", "venv", str(VENV)], ROOT)
    python = venv_python()
    assert python is not None
    stale = not INSTALLED_MARK.exists() or any(
        path.stat().st_mtime > INSTALLED_MARK.stat().st_mtime
        for path in (REQUIREMENTS, BACKEND / "requirements.txt")
    )
    if stale:
        run_step(
            "Installing requirements.txt...",
            [str(python), "-m", "pip", "install", "-q", "--disable-pip-version-check", "-r", str(REQUIREMENTS)],
            ROOT,
        )
        INSTALLED_MARK.touch()
    return python


def api_command() -> list[str]:
    command = [str(prepare_api()), "-m", "uvicorn", "app.main:app", "--reload"]
    if (BACKEND / ".env").exists():
        command += ["--env-file", ".env"]
    return command


def web_command() -> list[str]:
    npm = shutil.which("npm")
    if npm is None:
        sys.exit("npm not found. Install Node.js (nodejs.org or Homebrew) and try again.")
    # npm writes node_modules/.package-lock.json on install; an older copy means
    # package-lock.json gained packages since (for example after a git pull).
    installed = FRONTEND / "node_modules" / ".package-lock.json"
    lock = FRONTEND / "package-lock.json"
    if not installed.exists() or lock.stat().st_mtime > installed.stat().st_mtime:
        run_step("Installing frontend packages (npm install)...", [npm, "install"], FRONTEND)
    return [npm, "run", "dev"]


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target not in ("all", "api", "web"):
        sys.exit(__doc__)

    # Prepare both services before starting either, so a failed install stops everything.
    services = []
    if target in ("all", "api"):
        services.append(("API", api_command(), BACKEND, "http://localhost:8000/docs"))
    if target in ("all", "web"):
        services.append(("Web", web_command(), FRONTEND, "http://localhost:5173"))

    processes = []
    for name, command, cwd, url in services:
        print(f"{name}: {url}")
        processes.append(subprocess.Popen(command, cwd=cwd, env=os.environ.copy()))

    try:
        # Stop everything as soon as one service exits on its own.
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


if __name__ == "__main__":
    main()
