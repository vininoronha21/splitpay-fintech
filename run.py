"""Start SplitPay locally: the API (port 8000) and the web app (port 5173).

Usage:
    python run.py        # API and web app
    python run.py api    # API only
    python run.py web    # web app only

Press Ctrl+C to stop. Setup steps (venv, npm install) are in README.md.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def backend_python() -> Path | None:
    for candidate in ("bin/python", "Scripts/python.exe"):
        path = BACKEND / ".venv" / candidate
        if path.exists():
            return path
    return None


def api_command() -> list[str]:
    python = backend_python()
    if python is None:
        sys.exit("backend/.venv not found. Create it first (see README.md, Running Locally).")
    command = [str(python), "-m", "uvicorn", "app.main:app", "--reload"]
    if (BACKEND / ".env").exists():
        command += ["--env-file", ".env"]
    return command


def web_command() -> list[str]:
    npm = shutil.which("npm")
    if npm is None:
        sys.exit("npm not found. Install Node.js first (see README.md, Running Locally).")
    if not (FRONTEND / "node_modules").exists():
        sys.exit("frontend/node_modules not found. Run `npm install` in frontend/ first.")
    return [npm, "run", "dev"]


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target not in ("all", "api", "web"):
        sys.exit(__doc__)

    # Resolve both commands before starting anything, so a missing setup step fails fast.
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
