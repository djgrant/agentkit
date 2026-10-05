#!/usr/bin/env python3
"""Make the audio of one section again after you edit its text in SCRIPT.md.

    section.py <n>

If you only added words at the start or the end, only the new words are generated and joined to the
existing take. Otherwise the whole section is generated again. The old wav goes to assets/voice/history/.
Run build.py afterwards. Adding or removing a section is not supported; use tts.py --force.
"""
import os, shutil, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

JOIN_GAP = 0.5  # pause between new words and the existing take

n = int(sys.argv[1])
meta, sections = read_script()
m = load_meta()
if len(m["voices"]) != len(sections):
    sys.exit("SCRIPT.md and audio_meta.json have a different number of sections. Use tts.py --force.")
s, v = sections[n - 1], m["voices"][n - 1]
old, new = v["text"], s["text"]
if old == new:
    sys.exit(f"Section {n}: no text change.")

voice = m.get("voice", DEFAULT_VOICE)
prev = sections[n - 2]["text"] if n > 1 else None
nxt = sections[n]["text"] if n < len(sections) else None
pad = GAP_AFTER_LAST if n == len(sections) else GAP_AFTER

os.makedirs("assets/voice/history", exist_ok=True)
k = 1
while os.path.exists(f"assets/voice/history/{n:02d}.{k}.wav"): k += 1
src = f"assets/voice/history/{n:02d}.{k}.wav"
shutil.copy(v["path"], src)
out = v["path"]
tmp = tempfile.mktemp(suffix=".mp3")


def gen(text, **ctx):
    """Generate text; return (alignment, a, b): the span of speech in the mp3."""
    al = tts(text, voice, tmp, **ctx)
    a = max(0.0, al["character_start_times_seconds"][0] - 0.05)
    b = al["character_end_times_seconds"][-1] + 0.1
    return al, a, b


def clip(a, b):  # filter: the generated speech, trimmed, with a short fade out
    return f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=mono,afade=t=out:st={b - a - 0.05:.3f}:d=0.05"


old_words = [{"text": w["text"], "start": w["start"], "end": w["end"]} for w in v["words"]]
if new.endswith(old) and new != old:
    added = new[: len(new) - len(old)].strip()
    al, a, b = gen(added, previous_text=prev, next_text=old)
    d = b - a + JOIN_GAP
    ffmpeg("-i", tmp, "-i", src, "-filter_complex", f"{clip(a, b)},apad=pad_dur={JOIN_GAP}[p];[p][1:a]concat=n=2:v=0:a=1[o]",
           "-map", "[o]", "-ar", "44100", "-ac", "1", out)
    words = words_from(al, 0, len(al["characters"]), a) + [dict(w, start=round(w["start"] + d, 3), end=round(w["end"] + d, 3)) for w in old_words]
    how = f"added {added!r} at the start"
elif new.startswith(old):
    added = new[len(old):].strip()
    al, a, b = gen(added, previous_text=old, next_text=nxt)
    cut = old_words[-1]["end"] + 0.15
    d = cut + JOIN_GAP - a
    ffmpeg("-i", tmp, "-i", src, "-filter_complex",
           f"[1:a]atrim=0:{cut:.3f},apad=pad_dur={JOIN_GAP}[o1];{clip(a, b)},apad=pad_dur={pad}[n];[o1][n]concat=n=2:v=0:a=1[o]",
           "-map", "[o]", "-ar", "44100", "-ac", "1", out)
    words = old_words + [dict(w, start=round(w["start"] + d, 3), end=round(w["end"] + d, 3)) for w in words_from(al, 0, len(al["characters"]), 0)]
    how = f"added {added!r} at the end"
else:
    al, a, b = gen(new, previous_text=prev, next_text=nxt)
    ffmpeg("-i", tmp, "-filter_complex", f"{clip(a, b)},apad=pad_dur={pad}[o]", "-map", "[o]", "-ar", "44100", "-ac", "1", out)
    words = words_from(al, 0, len(al["characters"]), a)
    how = "generated the whole section again"
os.unlink(tmp)

v.update(text=new, slug=s["slug"], duration_s=duration(out), words=number(words))
save_meta(m)
print(f"Section {n}: {how}. {v['duration_s']:.2f}s (old take: {src}). Now run build.py.")
