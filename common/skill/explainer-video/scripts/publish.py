#!/usr/bin/env python3
"""Render the video and save it with its transcript to <repo>/.explainers/<source>.{mp4,md}.

    publish.py <repo>           # SCRIPT.md front matter gives `title` and `source` (path in <repo>)
    publish.py <repo> --no-render
"""
import os, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import read_script

if len(sys.argv) < 2:
    sys.exit(__doc__)
repo = os.path.abspath(sys.argv[1])
meta, sections = read_script()
for k in ("title", "source"):
    if k not in meta: sys.exit(f"SCRIPT.md front matter needs `{k}:`")
source = meta["source"]
if not os.path.exists(os.path.join(repo, source)):
    sys.exit(f"{source} is not in {repo}")

if "--no-render" not in sys.argv:
    subprocess.run(["npm", "run", "render", "--", "-o", "renders/video.mp4", "--quiet"], check=True)

stem = os.path.join(repo, ".explainers", os.path.splitext(source)[0])
os.makedirs(os.path.dirname(stem), exist_ok=True)
shutil.copy("renders/video.mp4", stem + ".mp4")
name = os.path.basename(stem)
link = os.path.relpath(os.path.join(repo, source), os.path.dirname(stem))
label = meta.get("source_label", os.path.basename(source))
body = "\n\n".join(s["source"] for s in sections)
if meta["notes"]:
    body += "\n\n" + "\n".join(f"[^{k}]: {v}" for k, v in meta["notes"].items())
open(stem + ".md", "w").write(f"# Transcript: {meta['title']}\n\nNarration for [{name}.mp4](./{name}.mp4), explaining [{label}]({link}).\n\n{body}\n")
print(f"Saved {stem}.mp4 and {stem}.md")
