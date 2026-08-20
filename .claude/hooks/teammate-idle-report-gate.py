#!/usr/bin/env python3
# Installed from the Codery catalog: issue-run @ 0.1.0 — a forward-install ahead of
# this system's next regeneration. Do not hand-edit below this header.
#
# TeammateIdle report gate — the issue-run design's Layer-1 mechanism.
#
# A teammate is about to go idle. Check the LEAD's transcript (the path the
# hook receives) for a report row from this teammate since its last assignment.
# None found -> exit 2, which blocks the idle transition and injects the stderr
# reminder into the TEAMMATE's context (observed on v2.1.220; the public hooks
# doc says the lead — see world/platform/agent-teams.md).
#
# Two blocks per assignment, then idle is allowed: a teammate that cannot or
# will not send must not livelock. Every other failure is fail-open (exit 0,
# silent), and stdout stays empty on every path — this hook never speaks JSON.

import json
import os
import re
import sys

REMINDER = (
    "Before going idle: send your completion report to the lead via "
    "SendMessage, then you may go idle."
)
RECIPIENT_FIELDS = ("recipient", "to", "teammate", "name")
MAX_BLOCKS = 2


def targets_teammate(obj, teammate):
    """True if obj, or anything nested in it, is a SendMessage aimed at teammate."""
    if isinstance(obj, dict):
        if (
            obj.get("name") == "SendMessage"
            and obj.get("type", "tool_use") == "tool_use"
            and isinstance(obj.get("input"), dict)
        ):
            for field in RECIPIENT_FIELDS:
                value = obj["input"].get(field)
                if isinstance(value, str) and value.strip() == teammate:
                    return True
        return any(targets_teammate(value, teammate) for value in obj.values())
    if isinstance(obj, list):
        return any(targets_teammate(value, teammate) for value in obj)
    return False


def scan(transcript_path, teammate):
    """Last assignment line and last report line, 1-based; 0 means never seen."""
    markers = (
        '<teammate-message teammate_id="%s"' % teammate,
        '<teammate-message teammate_id=\\"%s\\"' % teammate,
    )
    last_assignment = 0
    last_report = 0
    with open(transcript_path, "r", encoding="utf-8", errors="replace") as handle:
        for number, line in enumerate(handle, 1):
            if any(marker in line for marker in markers):
                last_report = number
            try:
                if targets_teammate(json.loads(line), teammate):
                    last_assignment = number
            except Exception:
                continue
    return last_assignment, last_report


def read_state(path):
    """Recorded (assignment_line, blocks); anything unreadable counts as fresh."""
    try:
        with open(path, "r", encoding="utf-8") as handle:
            state = json.load(handle)
        return int(state["assignment_line"]), int(state["blocks"])
    except Exception:
        return None, 0


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    if not isinstance(payload, dict):
        return 0
    if payload.get("hook_event_name") != "TeammateIdle":
        return 0
    teammate = payload.get("teammate_name")
    transcript = payload.get("transcript_path")
    if not isinstance(teammate, str) or not teammate:
        return 0
    if not isinstance(transcript, str) or not os.path.isfile(transcript):
        return 0

    try:
        last_assignment, last_report = scan(transcript, teammate)
    except Exception:
        return 0

    session = payload.get("session_id")
    state_path = "/tmp/teammate-idle-report-gate-%s-%s.json" % (
        re.sub(r"[^A-Za-z0-9._-]", "_", session if isinstance(session, str) else ""),
        re.sub(r"[^A-Za-z0-9._-]", "_", teammate),
    )

    if last_report > last_assignment:
        try:
            os.remove(state_path)
        except OSError:
            pass
        return 0

    recorded_line, blocks = read_state(state_path)
    if recorded_line != last_assignment:
        blocks = 0
    if blocks >= MAX_BLOCKS:
        return 0

    try:
        with open(state_path, "w", encoding="utf-8") as handle:
            json.dump({"assignment_line": last_assignment, "blocks": blocks + 1}, handle)
    except OSError:
        return 0

    print(REMINDER, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
