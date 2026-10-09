#!/usr/bin/env bash
set -euo pipefail
echo 'Super Agent v3 preflight (read-only)'
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status --short --branch
else
  echo 'No Git repository detected. Make a backup before installing the kit.'
fi
echo 'No files were modified; no commit, stash, reset, or cleanup was performed.'
