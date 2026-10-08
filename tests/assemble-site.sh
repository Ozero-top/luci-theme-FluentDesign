#!/bin/sh
# Assemble a static site tree combining the *real* LuCI core JS from a given
# openwrt/luci branch with this theme's settings view, styles and the browser
# harness. The assembled tree is what run-browser-tests.mjs drives.
#
# usage: assemble-site.sh <luci-branch> <dest-dir>
# e.g. : assemble-site.sh openwrt-25.12 site
set -eu

BRANCH="${1:?luci branch required, e.g. openwrt-25.12}"
DEST="${2:?destination directory required}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="https://raw.githubusercontent.com/openwrt/luci/${BRANCH}/modules/luci-base/htdocs/luci-static/resources"

RES="$DEST/luci-static/resources"
THEME="$DEST/luci-static/fluentdesign/css"
mkdir -p "$RES/view/system" "$THEME"

# Core runtime files as served by luci-base (jsmin-minified in real builds,
# the unminified branch sources behave identically for API purposes).
for f in cbi.js luci.js form.js ui.js uci.js rpc.js fs.js validation.js xhr.js; do
	curl -fsSL --retry 3 "$RAW/$f" -o "$RES/$f"
done

# Theme view + assets under test.
cp "$REPO_ROOT/htdocs/luci-static/resources/view/system/fluentdesign.js"  "$RES/view/system/"
cp "$REPO_ROOT/htdocs/luci-static/resources/view/system/fluentdesign.css" "$RES/view/system/"
cp "$REPO_ROOT/htdocs/luci-static/fluentdesign/css/cascade.css" "$THEME/"
cp "$REPO_ROOT/htdocs/luci-static/fluentdesign/css/dark.css"     "$THEME/"
cp "$REPO_ROOT/tests/harness/index.html" "$DEST/index.html"

echo "assembled site for luci branch '$BRANCH' at $DEST"
