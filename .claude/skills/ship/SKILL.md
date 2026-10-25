---
name: ship
description: Build, test, commit all changes and push to origin. Use when the user says ship, commit and push, or asks to commit/push.
---

Run `bash scripts/ship.sh "<short imperative commit message>"` and report its output in one line.
Do not run git status/diff/log or read files first; the script does everything.
If it prints BUILD FAILED or TESTS FAILED, fix the cause and rerun.
Before running, tick the finished stage in `docs/STAGES.md` if it isn't already.
