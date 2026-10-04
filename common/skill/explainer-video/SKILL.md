---
name: explainer-video
description: Make a narrated explainer video from a technical document.
---

# Explainer videos

Use this when you make a narrated explainer video from a technical document (e.g. an RFC, a design doc, a README).

Read all three before you start:

| File | Covers |
|---|---|
| This file | Method and tools |
| [source-material.md](./source-material.md) | How to read the source document |
| [prose.md](./prose.md) | How to write the narration, with bad and good examples |

## Method

1. Use the `/hyperframes` skill and then open its `/faceless-explainer`.
2. Write the script before anything else. Show it to the user as plain text and get approval. A rejected script costs one message. A rejected video costs a full rebuild.
3. Default to using Eleven Lab's Eric voice. If the user asks for a different voice, generate the same passage of the real script (about 15 s) with 3–4 voices, and let the user listen.
4. Plan the length from the script, and tell the user the expected length when you show the script.
5. Design one shared stage before frames. If dispatching workers, give the exact coordinates for the recurring objects – for example the process box, the provider panel, the state card and the log strip. Each event must happen to an object on that stage.
6. Do not add sound effects. Voice only, unless the user asks for them.

## Voice: ElevenLabs

The HyperFrames audio pipeline hardcodes `eleven_multilingual_v2` (`media-use/audio/scripts/lib/tts.mjs`). Do not use the pipeline for the voice. Call the API directly:

- Model: `eleven_v4`.
- Endpoint: `POST /v1/text-to-speech/{voice_id}/with-timestamps`. It returns the audio and a per-character alignment. Make words from the alignment. You then do not need Whisper, and the captions have no transcription errors.
- Send the whole script in one request, with sections separated by blank lines. If you send each section in a separate request, the delivery loses its flow between sentences.
- Cut the audio at the section boundaries, and add about 1 s of silence after each section (about 2 s after the last one). The silence gives the viewer time to process each idea before the next one starts. Frame duration = section audio + silence. Each frame must finish its visuals before its silence starts.
- Write `audio_meta.json` yourself (`voices[]` with `frame`, `path`, `duration_s` and `words`; `sfx: []`). After that, do not run `audio.mjs` again: its `fetch-sfx` and `sync-durations` modes reload the old engine output and overwrite your voices.
- The user's key is in 1Password ("ElevenLabs API Key (personal)"). Give it to commands with `2password env run` and a `.env.tpl` file.

## Pipeline problems that cost time

- `~/.claude/skills` is a symlink. `captions.mjs` then exits silently and writes nothing. Run the workflow scripts by their real path: `S=$(realpath ~/.claude/skills/faceless-explainer/scripts)`.
- The frame packets do not include `## Video direction` from the storyboard. Copy that section to `.hyperframes/frame-packets/_video-direction.md` and tell each worker to read it, or the frames do not share a stage.
- Put the font files in `assets/fonts/` and tell any workers about them.
- Tell the workers: do not type text with `onUpdate` callbacks, because a seek skips them. Also prefix the ids and classes, because frame ids start with a digit.
- Put the project outside the source repository.
