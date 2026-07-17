#!/bin/bash
# Miku Pastel launcher
set -e
ROOT="$(cd "$(dirname "$0")" && pwd -P)"
exec "$ROOT/scripts/verify-theme.sh"
