#!/bin/sh
# Unsigned Mac builds from the browser get a quarantine flag. That is not damage.
set -e
app="${1:-/Applications/SETFORM.app}"
if [ ! -d "$app" ]; then
  echo "SETFORM.app not found at $app" >&2
  echo "Pass the path: $0 /path/to/SETFORM.app" >&2
  exit 1
fi
xattr -dr com.apple.quarantine "$app"
echo "Quarantine removed. Open $app with a double-click."
