"""Clinic host starter (docs/OFFLINE_SYNC_CONTRACT.md, section 5.3).

Run on the reception PC. It
  1. makes sure MySQL is running,
  2. applies database migrations,
  3. starts the MediFlow backend (which also serves the web app) on one address,
  4. waits until the health check answers, and
  5. opens the default browser on the clinic address.

Only the Python standard library is used here, so it works before anything else is installed.
Leave the window open while the clinic works; close it (or press Ctrl+C) to stop the server.
"""
import argparse
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "BackEnd"
DEFAULT_PORT = 80


def load_env(path: Path) -> dict:
    """Read KEY=value lines from a .env file. Comments and blank lines are ignored."""
    values = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def clinic_url(port: int, host: str = "127.0.0.1") -> str:
    return f"http://{host}/" if port == 80 else f"http://{host}:{port}/"


def lan_address() -> str | None:
    """This PC's address on the clinic network, for telling staff where to connect."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("10.255.255.255", 1))  # no packet is sent
            return probe.getsockname()[0]
    except OSError:
        return None


def port_open(host: str, port: int, timeout: float = 1.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def ensure_mysql(host: str, port: int, service: str, wait: int = 60) -> bool:
    """True once MySQL answers. On Windows, tries to start the service first (needs an administrator)."""
    if port_open(host, port):
        return True
    if host in ("127.0.0.1", "localhost") and sys.platform == "win32" and service:
        print(f"Starting the {service} service...")
        subprocess.run(["net", "start", service], capture_output=True, text=True)
    deadline = time.time() + wait
    while time.time() < deadline:
        if port_open(host, port):
            return True
        time.sleep(1)
    return False


def wait_for_health(url: str, timeout: int = 90, interval: float = 1.0) -> bool:
    """True once the health endpoint says ok with a working database."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                payload = json.loads(response.read().decode("utf-8") or "{}")
                if response.status == 200 and payload.get("status") == "ok" and payload.get("database") is True:
                    return True
        except (urllib.error.URLError, OSError, ValueError):
            pass
        time.sleep(interval)
    return False


def python_for_backend() -> str:
    """The backend's own virtual environment when it has one, otherwise the Python running this."""
    if sys.platform == "win32":
        venv = BACKEND / "venv" / "Scripts" / "python.exe"
    else:
        venv = BACKEND / "venv" / "bin" / "python"
    return str(venv) if venv.is_file() else sys.executable


def run_manage(args: list[str], env: dict) -> int:
    return subprocess.run([python_for_backend(), "manage.py", *args], cwd=BACKEND, env=env).returncode


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Start the MediFlow clinic server.")
    parser.add_argument("--port", type=int, help="Address port (default: NODE_PORT or 80).")
    parser.add_argument("--skip-migrate", action="store_true")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)

    env_file = load_env(BACKEND / ".env")
    port = args.port or int(env_file.get("NODE_PORT") or DEFAULT_PORT)
    env = {**os.environ, **env_file, "NODE_MODE": "clinic"}

    if not (BACKEND / ".env").is_file():
        print("BackEnd/.env is missing. Run install_clinic_node.ps1 first.")
        return 2
    if not Path(env.get("FRONTEND_DIR") or ROOT / "dist-node").is_dir():
        print("Warning: the web app (dist-node folder) is not installed; pages will not load.")

    db_host, db_port = env.get("DB_HOST", "127.0.0.1"), int(env.get("DB_PORT") or 3306)
    print(f"Checking MySQL at {db_host}:{db_port}...")
    if not ensure_mysql(db_host, db_port, env.get("MYSQL_SERVICE", "MySQL80")):
        print("MySQL is not running and could not be started. Start it, then run this again.")
        return 3

    if not args.skip_migrate:
        print("Updating the database...")
        if run_manage(["migrate", "--noinput"], env) != 0:
            print("The database update failed. See the messages above.")
            return 4

    print(f"Starting MediFlow on port {port}...")
    server = subprocess.Popen(
        [python_for_backend(), "-m", "waitress", f"--listen=0.0.0.0:{port}", "config.wsgi:application"],
        cwd=BACKEND,
        env=env,
    )
    try:
        local = clinic_url(port)
        if not wait_for_health(local + "api/health/"):
            print("The server did not become healthy in time. See the messages above.")
            server.terminate()
            return 5
        lan = lan_address()
        print(f"\nMediFlow is running.\n  This PC:   {local}")
        if lan:
            print(f"  Other PCs: {clinic_url(port, lan)}")
        print("\nLeave this window open while the clinic works. Press Ctrl+C to stop.")
        if not args.no_browser:
            webbrowser.open(local)
        return server.wait()
    except KeyboardInterrupt:
        print("\nStopping...")
        server.terminate()
        try:
            server.wait(timeout=15)
        except subprocess.TimeoutExpired:
            server.kill()
        return 0


if __name__ == "__main__":
    sys.exit(main())
