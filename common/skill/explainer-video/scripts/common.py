"""Shared helpers: SCRIPT.md parsing, ElevenLabs requests, word alignment, ffmpeg."""
import json, os, re, subprocess, sys, tempfile

MODEL = "eleven_v4"
DEFAULT_VOICE = "cjVigY5qzO86Huf0OWal"  # Eric
GAP_AFTER = 1.0       # silence after each section
GAP_AFTER_LAST = 2.0  # silence after the last section


def read_script(path="SCRIPT.md"):
    """Return (meta, sections). meta: front matter dict. sections: [{n, slug, text}]."""
    src = open(path).read()
    meta = {}
    fm = re.match(r"^---\n(.*?)\n---\n", src, re.S)
    if fm:
        for line in fm.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        src = src[fm.end():]
    sections = []
    for m in re.finditer(r"^## (\d+) (\S+)\s*\n(.*?)(?=^## |\Z)", src, re.S | re.M):
        text = " ".join(m.group(3).split())
        sections.append({"n": int(m.group(1)), "slug": m.group(2), "text": text})
    if not sections:
        sys.exit("SCRIPT.md has no sections. Use '## 01 slug' headings.")
    for i, s in enumerate(sections):
        if s["n"] != i + 1:
            sys.exit(f"SCRIPT.md: section {i + 1} is numbered {s['n']}")
    return meta, sections


def frame_id(s):
    return f"{s['n']:02d}-{s['slug']}"


def tts(text, voice, out_mp3, previous_text=None, next_text=None):
    """One ElevenLabs request. Writes the mp3 and returns the alignment."""
    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY is not set")
    body = {"text": text, "model_id": MODEL}
    if previous_text: body["previous_text"] = previous_text
    if next_text: body["next_text"] = next_text
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128"
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(body, f)
    # curl uses the system certificates; the key goes in on stdin, not on the command line
    r = subprocess.run(["curl", "-sS", "--fail-with-body", "-X", "POST", url, "-H", "@-", "--data-binary", f"@{f.name}"],
                       input=f"xi-api-key: {key}\nContent-Type: application/json\n", capture_output=True, text=True)
    os.unlink(f.name)
    if r.returncode:
        sys.exit(f"ElevenLabs request failed: {r.stdout or r.stderr}")
    res = json.loads(r.stdout)
    import base64
    open(out_mp3, "wb").write(base64.b64decode(res["audio_base64"]))
    return res["alignment"]


def words_from(al, a, b, t0):
    """Words for characters a..b-1 of an alignment, with times relative to t0."""
    chars, starts, ends = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    words, cur = [], None
    for k in range(a, b):
        if chars[k].isspace():
            if cur: words.append(cur); cur = None
            continue
        if cur is None: cur = {"text": "", "start": round(starts[k] - t0, 3)}
        cur["text"] += chars[k]; cur["end"] = round(ends[k] - t0, 3)
    if cur: words.append(cur)
    return words


def number(words):
    return [{"id": f"w{j}", **w} for j, w in enumerate({"text": w["text"], "start": w["start"], "end": w["end"]} for w in words)]


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def duration(path):
    """Media length in seconds, rounded down to 0.01 so a slot is never longer than its media."""
    return int(100 * float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))) / 100


def load_meta():
    return json.load(open("audio_meta.json"))


def save_meta(m):
    json.dump(m, open("audio_meta.json", "w"), indent=1)
