import shutil
import sys
from datetime import datetime
from pathlib import Path

from app.core.config import settings


def backup(db_path: Path, backup_dir: Path) -> Path:
    """Copy db_path into backup_dir with a timestamp suffix. Returns the destination path."""
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = backup_dir / f"{db_path.stem}_{timestamp}.db"
    counter = 1
    while dest.exists():
        dest = backup_dir / f"{db_path.stem}_{timestamp}_{counter}.db"
        counter += 1
    shutil.copy2(db_path, dest)
    return dest


def _resolve_db_path() -> Path:
    url = settings.database_url
    if not url.startswith("sqlite:///"):
        print(
            f"ERROR: DATABASE_URL ({url!r}) is not a local SQLite path. Nothing to back up.",
            file=sys.stderr,
        )
        sys.exit(1)

    raw = url[len("sqlite:///"):]
    path = Path(raw)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def main() -> None:
    db_path = _resolve_db_path()

    if not db_path.is_file():
        print(f"ERROR: Database file not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    backup_dir = Path.cwd() / "backups"
    dest = backup(db_path, backup_dir)
    print(f"Backup created: {dest}")


if __name__ == "__main__":
    main()
