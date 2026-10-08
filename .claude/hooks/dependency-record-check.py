#!/usr/bin/env python3
"""SessionStart check: the detection half of the technology gate.

Hand-maintained in this repo; same contract as Huella's dependency-record
check, rewritten for a Node/pnpm manifest (Huella's parses pyproject.toml).

Reports every package named in package.json (dependencies, devDependencies,
optionalDependencies, peerDependencies, and the keys of pnpm.overrides) that is
not recorded. A name counts as recorded only when it appears as an exact
backticked token in docs/stack.md or in a file under docs/adr/. Backticks keep
prose from shadowing a name ("next", "sharp" are ordinary words).

It is a REPORT, not a gate: it never blocks a session, always exits 0, and says
nothing when there is no readable package.json. Output is plain prose on stdout
(the SessionStart channel the session sees), mirrored to stderr. Never JSON:
JSON-shaped stdout would be parsed as hook control output.

Known gaps, stated rather than implied: lockfile transitives are not checked
(pnpm-lock.yaml holds hundreds; each is covered by its direct parent in the
record); a major version bump of an already-recorded package is not detected
(the technology gate covers bumps in conversation); a name written without
backticks is not seen as recorded, so this can over-report, never hide a gap.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

SECTIONS = ("dependencies", "devDependencies", "optionalDependencies", "peerDependencies")
BACKTICKED = re.compile(r"`([^`\n]+)`")


def project_root() -> Path | None:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env)
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return Path(out.stdout.strip()) if out.returncode == 0 and out.stdout.strip() else None


def declared_names(manifest: dict) -> list[str]:
    names: set[str] = set()
    for section in SECTIONS:
        block = manifest.get(section)
        if isinstance(block, dict):
            names.update(str(k) for k in block)
    pnpm = manifest.get("pnpm")
    overrides = pnpm.get("overrides") if isinstance(pnpm, dict) else None
    if isinstance(overrides, dict):
        names.update(str(k) for k in overrides)
    return sorted(names)


def recorded_tokens(root: Path) -> set[str]:
    files = [root / "docs" / "stack.md", *sorted((root / "docs" / "adr").glob("*.md"))]
    tokens: set[str] = set()
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except OSError:
            continue
        tokens.update(m.strip() for m in BACKTICKED.findall(text))
    return tokens


def main() -> None:
    root = project_root()
    if root is None:
        return
    try:
        manifest = json.loads((root / "package.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return
    if not isinstance(manifest, dict):
        return

    recorded = recorded_tokens(root)
    missing = [n for n in declared_names(manifest) if n not in recorded]
    if not missing:
        return

    lines = [
        f"Dependency-record check: {len(missing)} package(s) in package.json with no decision record:",
        *[f"  - {n}" for n in missing],
        "Each needs an ADR under docs/adr/ or an entry in docs/stack.md (CLAUDE.md, Tural decides).",
        "A name counts only when it appears in backticks. This is a report, not a gate.",
    ]
    report = "\n".join(lines) + "\n"
    sys.stdout.write(report)
    sys.stderr.write(report)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
