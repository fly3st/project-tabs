#!/bin/sh
# Builds the Chrome Web Store upload: dist/project-tabs-<version>.zip
# Only the files the extension needs at runtime go in.
set -e
cd "$(dirname "$0")/.."
version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
mkdir -p dist
out="dist/project-tabs-$version.zip"
rm -f "$out"
zip -q -X "$out" manifest.json background.js sidepanel.html sidepanel.css sidepanel.js \
  icons/16.png icons/32.png icons/48.png icons/128.png
echo "$out"
unzip -l "$out"
