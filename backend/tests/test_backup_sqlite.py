from pathlib import Path

from app.scripts.backup_sqlite import backup


def test_backup_creates_copy(tmp_path: Path) -> None:
    src = tmp_path / "cobaltrack.db"
    src.write_bytes(b"SQLite format 3\x00test data")
    backup_dir = tmp_path / "backups"

    dest = backup(src, backup_dir)

    assert dest.is_file()
    assert dest.read_bytes() == src.read_bytes()
    assert dest.parent == backup_dir
    assert dest.name.startswith("cobaltrack_")
    assert dest.suffix == ".db"


def test_backup_creates_backup_dir_if_missing(tmp_path: Path) -> None:
    src = tmp_path / "cobaltrack.db"
    src.write_bytes(b"data")
    backup_dir = tmp_path / "deep" / "backups"

    dest = backup(src, backup_dir)

    assert backup_dir.is_dir()
    assert dest.is_file()


def test_backup_does_not_overwrite_previous(tmp_path: Path) -> None:
    src = tmp_path / "cobaltrack.db"
    src.write_bytes(b"version 1")
    backup_dir = tmp_path / "backups"

    first = backup(src, backup_dir)
    src.write_bytes(b"version 2")
    second = backup(src, backup_dir)

    assert first != second
    assert first.read_bytes() == b"version 1"
    assert second.read_bytes() == b"version 2"
