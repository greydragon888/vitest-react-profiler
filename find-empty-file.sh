#!/usr/bin/env bash
set -euo pipefail

DIR="${1:-.}"

# Найти пустые файлы, исключая каталог node_modules
find "$DIR" -type d -name node_modules -prune -o -type f -empty -print
