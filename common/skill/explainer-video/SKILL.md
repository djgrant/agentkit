---
name: explainer-video
description: Make a narrated explainer video from a technical document.
---

# Explainer videos

Make a narrated video from a technical document (RFC, design doc, README). The only other skill you need is `hyperframes-core`; load it before the first frame.

See `writing/rules.md` for how draft the script.
See `kit/README.md` for how to write the stage and frames.

## Method

1. Read the source.
2. Write the script. Once you have a draft, check it against prose.md to make sure it is compliant with the writing rules. 
3. Show the script to the user with the expected length (about 150 words per minute) and get approval before you continue. If the user asked for changes, present the updated script with the changed text highlighted to they can easily find the changes.
4. Create a project for the video in ~/Movies/explainers, intialising it with `sh "$(ak where skill explainer-video)/scripts/new.sh" <videos-dir>/<name>`. Put the script in `SCRIPT.md`, one `## NN slug` section per frame.
5. Write `stage.html`: the objects that most frames share, with exact coordinates.
6. Write `frames/NN-slug.html` for each section: its own objects and one cue per event. The words are in `audio_meta.json`.
7. Once confirmed, make the voice: `npm run voice`.
8. Build and check: `npm run build && npm run check`. Fix all errors and design warnings. Run the `review:` command that `build` prints, and check the contact sheet against the Design list in `kit/README.md`.
9. Show the user the preview: `npm run preview`. After approval: `npm run publish -- <repo>`. This writes `<repo>/.explainers/<source>.{mp4,md}`.

## Changes

- Section text: edit `SCRIPT.md`, then `npm run section -- <n> && npm run build`. If you only add words at the start or end you can keep the old take. Cues follow the words, so frames need no changes.
- Visuals: edit `stage.html` or `frames/`, then `npm run build`.
- Add or remove a section: `npm run voice -- --force` (makes all audio again).

`npm run build` writes `index.html` and `compositions/`. Do not edit them.

## Rules

- Voice: ElevenLabs `eleven_v4`, Eric by default. For another voice, set `voice: <id>` in the `SCRIPT.md` front matter. If the user wants to choose, make about 15 s of the script with 3–4 voices.
- The key is in 1Password ("ElevenLabs API Key (personal)"). `new.sh` writes `.env.tpl`.
- Voice only. Add sound effects or music only if the user asks.
- Each frame finishes its moves before its narration ends. The 1 s silence after each section (2 s at the end) gives the viewer time to process each idea.
- One agent can usually write all frames. If you use workers, give each one `kit/README.md`, `stage.html` and its section of `audio_meta.json`.
