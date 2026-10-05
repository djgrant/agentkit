#!/usr/bin/env python3
"""Make the whole narration in one ElevenLabs request, cut it per section, write audio_meta.json.

Run once, in the project directory. To change one section later, use section.py.
--recut cuts the existing take again (assets/voice/full.*) without a new request.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

meta, sections = read_script()
voice = meta.get("voice", DEFAULT_VOICE)
recut = "--recut" in sys.argv
if os.path.exists("audio_meta.json") and "--force" not in sys.argv and not recut:
    sys.exit("audio_meta.json exists. Use section.py to change one section, --recut to cut the take again, or --force to make all audio again.")

os.makedirs("assets/voice", exist_ok=True)
text = "\n\n".join(s["text"] for s in sections)
if recut:
    al = json.load(open("assets/voice/full.json"))
else:
    al = tts(text, voice, "assets/voice/full.mp3")
    json.dump(al, open("assets/voice/full.json", "w"))
assert "".join(al["characters"]) == text, "alignment text differs from request text"
starts, ends = al["character_start_times_seconds"], al["character_end_times_seconds"]

spans, pos = [], 0
for s in sections:
    spans.append((pos, pos + len(s["text"]))); pos += len(s["text"]) + 2

# cut in the middle of the pause between two sections, found in the audio itself
sil = silences("assets/voice/full.mp3")
cuts = []
for (_, b), (a, _) in zip(spans, spans[1:]):
    cuts.append(snap_cut(sil, starts[b - 1] - 0.5, ends[a] + 0.1, (ends[b - 1] + starts[a]) / 2))

voices = []
for i, (s, (a, b)) in enumerate(zip(sections, spans)):
    last = i + 1 == len(sections)
    t0 = 0.0 if i == 0 else cuts[i - 1]
    t1 = ends[b - 1] + 0.3 if last else cuts[i]
    pad = GAP_AFTER_LAST if last else GAP_AFTER
    out = f"assets/voice/{s['n']:02d}.wav"
    ffmpeg("-ss", f"{t0:.3f}", "-to", f"{t1:.3f}", "-i", "assets/voice/full.mp3", "-af", f"apad=pad_dur={pad}", "-ar", "44100", "-ac", "1", out)
    voices.append({"frame": s["n"], "slug": s["slug"], "text": s["text"], "path": out,
                   "duration_s": duration(out), "words": number(words_from(al, a, b, t0))})

save_meta({"voice": voice, "voices": voices})
for v in voices: print(f"{v['frame']:02d} {v['duration_s']:6.2f}s")
print(f"total {sum(v['duration_s'] for v in voices):.2f}s")
