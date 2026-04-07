import subprocess
import sys


def run(cmd: list[str]):
    print("Running:", " ".join(cmd))
    proc = subprocess.run(cmd)
    if proc.returncode != 0:
        raise SystemExit(proc.returncode)


def main():
    py = sys.executable
    run([py, "scripts/import-ohaus-quote-template-xlsx.py"])
    run([py, "scripts/audit-ohaus-quote-template-sync.py"])
    print("Sync + audit completed OK.")


if __name__ == "__main__":
    main()
