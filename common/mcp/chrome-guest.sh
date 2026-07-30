#!/bin/sh
# Playwright MCP extension mode spawns this instead of Chrome directly.
# Chrome forwards --profile-directory to the running instance, so the relay
# page always opens in the "Guest" profile regardless of the active window.
exec "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --profile-directory="Profile 4" "$@"
