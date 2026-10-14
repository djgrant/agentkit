#!/bin/sh
# Publish an RFC as a GitHub issue with its explainer video under the Abstract.
# Usage: publish-rfc.sh <rfc-number> <owner/repo> <video>   (run from the repo holding rfcs/)
set -eu

num=$(printf '%03d' "$(echo "$1" | sed 's/^0*//')")
repo=$2
video=$(cd "$(dirname "$3")" && pwd)/$(basename "$3")
catalog=${LENS_CATALOG:-$HOME/Repos/operations/lenses-catalog/github}

rfc=$(ls rfcs/"$num"-*.md 2>/dev/null | head -1)
[ -n "$rfc" ] || { echo "no rfcs/$num-*.md in $PWD" >&2; exit 1; }
base=$(basename "$rfc" .md)
[ -f "$video" ] || { echo "no video at $video" >&2; exit 1; }

title="RFC $num: $(sed -n 's/^# //p' "$rfc" | head -1)"
existing=$(gh issue list -R "$repo" --state all --search "\"RFC $num:\" in:title" --json number,title \
  --jq ".[] | select(.title | startswith(\"RFC $num:\")) | .number" | head -1)
[ -z "$existing" ] || { echo "already published: https://github.com/$repo/issues/$existing" >&2; exit 1; }

work=$(mktemp -d)
# Body: the RFC without its frontmatter and H1.
awk 'NR==1 && /^---$/ {fm=1; next} fm && /^---$/ {fm=0; next} !fm' "$rfc" \
  | sed '/./,$!d' | sed '1{/^# /d;}' | sed '/./,$!d' > "$work/body.md"

# GitHub caps free-plan video attachments at 10 MB: two-pass encode to ~9.5 MB at 720p.
duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$video")
vkbps=$(awk -v d="$duration" 'BEGIN { printf "%d", 9.5 * 8 * 1024 * 1024 / 1000 / d - 48 - 8 }')
(cd "$work" && ffmpeg -y -v error -i "$video" -vf scale=1280:-2 -c:v libx264 -preset slow \
  -b:v "${vkbps}k" -pass 1 -an -f mp4 /dev/null \
  && ffmpeg -y -v error -i "$video" -vf scale=1280:-2 -c:v libx264 -preset slow \
  -b:v "${vkbps}k" -pass 2 -c:a aac -b:a 48k -ac 1 -movflags +faststart "$base.mp4")

url=$(gh issue create -R "$repo" --title "$title" --label enhancement --body-file "$work/body.md")
issue=${url##*/}
echo "created $url" >&2
echo "compressed video: $work/$base.mp4" >&2

result=$(lens call github/issue-attachment --catalog "$catalog" --allow-writes --timeout-ms 300000 \
  --params "{\"owner\":\"${repo%/*}\",\"repo\":\"${repo#*/}\",\"issue\":$issue,\"path\":\"$work/$base.mp4\"}")
asset=$(printf '%s' "$result" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);if(r.kind!=="value"){console.error(s);process.exit(1)}console.log(r.value.url)})')

# The video goes after the Abstract, before the next section.
awk -v asset="$asset" '
  /^## / && seen && !done { print asset; print ""; print ""; done=1 }
  /^## Abstract/ { seen=1 }
  { print }
' "$work/body.md" > "$work/body-with-video.md"
gh issue edit "$issue" -R "$repo" --body-file "$work/body-with-video.md" >/dev/null
rm -rf "$work"
echo "$url"
