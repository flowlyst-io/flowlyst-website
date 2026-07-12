#!/bin/bash
# infra-guard.sh — PreToolUse guard for Tural-operated surfaces.
#
# Denies Bash commands that invoke Vercel/Neon in command position (bare, after a
# shell separator, via an npx/dlx/exec runner, or via node_modules/.bin/) or that
# make a destructive `gh api` DELETE call. Ask-rules in settings.json can't
# enumerate every runner wrapper; this deterministic check backstops them.
#
# House rules (hard-earned): bash-3.2 safe — no ${var,,}, no arrays, no mapfile.
# Parse stdin defensively; exit 0 silently on any missing tool / field / bad JSON;
# never crash the tool call.

# jq is required to read the payload. If it's absent, do not block.
command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
[ -n "$input" ] || exit 0

# Extract the command; empty / unparseable → allow.
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -n "$cmd" ] || exit 0

deny=0

# Vercel / Neon in command position:
#   (^|separator) directly before the tool, OR after an npx/dlx/exec runner,
#   OR via node_modules/.bin/ ; trailing boundary so vercel.json / vercelize don't match.
if printf '%s' "$cmd" | grep -iEq '((^|[;&|(])[[:space:]]*|(^|[;&|(]|[[:space:]])(npx|dlx|exec)([[:space:]]+-[^[:space:]]+)*[[:space:]]+|node_modules/\.bin/)(vercel|neonctl|neon)([^[:alnum:]._-]|$)'; then
  deny=1
fi

# Destructive gh api: `gh api` present AND a DELETE method.
if printf '%s' "$cmd" | grep -iEq 'gh[[:space:]]+api'; then
  if printf '%s' "$cmd" | grep -iEq '(-X|--method)[[:space:]=]+DELETE|-XDELETE'; then
    deny=1
  fi
fi

if [ "$deny" -eq 1 ]; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Vercel/Neon operations and destructive gh api calls are Tural-operated surfaces (see .codery/system.md — his steer: he handles Vercel and Neon). Prepare config/runbook output for him instead. If this is a false positive on a harmless command, rephrase the command or ask Tural to run it."}}'
  exit 0
fi

exit 0
