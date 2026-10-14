#!/bin/sh
# Unsigned Mac builds from the browser get a quarantine flag. That is not damage.
set -e
app="${1:-/Applications/SETBUILDER.app}"
if [ ! -d "$app" ]; then
  echo "SETBUILDER.app not found at $app" >&2
  echo "Pass the path: $0 /path/to/SETBUILDER.app" >&2
  exit 1
fi
xattr -dr com.apple.quarantine "$app"
echo "Quarantine removed. Open $app with a double-click."
