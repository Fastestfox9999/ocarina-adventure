"""Assemble and verify the texture archive after cloning this repository."""
from pathlib import Path
import hashlib
import os
import tempfile
import shutil

root = Path(__file__).resolve().parent
target = root / "site" / "oot-reloaded.o2r"
digest = "a9451e5ccdd7d1ef25c797f64e7e19fe235de5f400bb79cf7907c2629d284e63"

def checksum(path):
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()

if not target.exists() or checksum(target) != digest:
    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as output:
        temporary = Path(output.name)
        try:
            for part in range(1, 4):
                with (root / "assets" / f"reloaded.part{part}").open("rb") as source:
                    shutil.copyfileobj(source, output)
            output.close()
            if checksum(temporary) != digest:
                raise ValueError("Texture archive failed verification.")
            os.replace(temporary, target)
        finally:
            temporary.unlink(missing_ok=True)
