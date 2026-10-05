#!/bin/sh
# Make a new explainer project.   new.sh <videos-dir>/<name>
# Writes the skill's script paths into package.json, so the project runs them with npm.
set -eu
HF=0.8.125   # pinned HyperFrames CLI version
[ $# -eq 1 ] || { echo "usage: new.sh <dir>" >&2; exit 1; }
SKILL=$(cd "$(dirname "$(realpath "$0")")/.." && pwd)
dir=$1
[ ! -e "$dir" ] || { echo "$dir exists" >&2; exit 1; }

mkdir -p "$(dirname "$dir")"
(cd "$(dirname "$dir")" && HYPERFRAMES_SKIP_SKILLS=1 npx --yes "hyperframes@$HF" init "$(basename "$dir")" --example blank --non-interactive --skill explainer-video >/dev/null)
cd "$dir"
rm -rf compositions index.html
cp "$SKILL/templates/CLAUDE.md" CLAUDE.md
cp "$SKILL/templates/CLAUDE.md" AGENTS.md
cp "$SKILL/templates/SCRIPT.md" SCRIPT.md
cp "$SKILL/templates/stage.html" stage.html
mkdir -p frames assets/fonts
cp "$SKILL/kit/fonts/"*.woff2 assets/fonts/
printf 'ELEVENLABS_API_KEY=op://Private/gyps43liylukre2rohkqdiadsm/credential\n' > .env.tpl
cat > package.json <<EOF
{
  "name": "$(basename "$dir")",
  "private": true,
  "type": "module",
  "scripts": {
    "voice": "2password env run .env.tpl -- python3 $SKILL/scripts/tts.py",
    "section": "2password env run .env.tpl -- python3 $SKILL/scripts/section.py",
    "build": "python3 $SKILL/scripts/build.py",
    "check": "npx --yes hyperframes@$HF check",
    "preview": "npx --yes hyperframes@$HF preview --background",
    "render": "npx --yes hyperframes@$HF render",
    "publish": "python3 $SKILL/scripts/publish.py"
  }
}
EOF
echo "Made $dir"
