#!/usr/bin/env bash
# Usage: scripts/ship.sh "commit message"
# Runs build + tests, commits everything, pushes. Prints only a short summary (or the failure output).
set -u
msg="${1:-}"
[ -z "$msg" ] && { echo "usage: scripts/ship.sh \"commit message\""; exit 2; }

out=$(npm run build 2>&1) || { echo "BUILD FAILED"; echo "$out" | tail -30; exit 1; }
out=$(npx vitest run 2>&1) || { echo "TESTS FAILED"; echo "$out" | tail -30; exit 1; }

git add -A
if git diff --cached --quiet; then
  echo "nothing to commit"
else
  git commit -q -m "$msg" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" 2>/dev/null || exit 1
fi
git push -q 2>&1 | grep -v 'LF will be replaced'
git log --oneline -1
git status -sb | head -1
