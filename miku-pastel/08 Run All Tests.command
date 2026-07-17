#!/bin/bash
# Miku Pastel launcher
set -e
ROOT="$(cd "$(dirname "$0")" && pwd -P)"
exec "$ROOT/scripts/test-package.sh"
