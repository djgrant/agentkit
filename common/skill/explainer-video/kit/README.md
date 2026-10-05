# Explainer kit

`kit.css` gives the look and `kit.js` the moves. `build.py` adds both to every frame. You write:

- `stage.html`: objects that most frames share. Write it once, before the frames.
- `frames/NN-slug.html`: the frame's own objects, then one `<script>` with cues. Example: `../templates/frame.html`.

## Layout

- Canvas 1920×1080. Keep content between y 58 and y 872; captions use the area below.
- Title: `.k-title` (top left), one `.k-word` per word.
- Position objects with `left`, `top`, `width`, `height` in a `<style>` block.
- Use classes, not ids. Prefix with `f03-` (frame) or `st-` (stage).
- Lines and arrows: one `<svg class="k-svg" viewBox="0 0 1920 1080">`. A path you `draw` needs `pathLength="1"`.

## Classes

- `k-box`, `k-dash`: solid, dashed box
- `k-label`: small uppercase label
- `k-mono`: code, fields, values
- `k-serif`: object names
- `k-tag`: filled tag (KEY, IMMUTABLE)
- `k-chip`: bordered status row
- `k-line`, `k-line-dash`, `k-fill`: SVG stroke, dashed stroke, fill
- `k-static`: no absolute position (inside flex)
- `k-faint`: 60 % opacity

## Cues

A cue is the time of a word in the frame's narration. Case and punctuation do not matter.

- `"path"`: first "path"
- `"path#2"`: second "path"
- `"path+0.3"`, `"path#2-0.1"`: with an offset in seconds
- `4.2`: seconds from the frame start

An unknown cue throws an error that lists the words. `npm run check` shows it.

## Moves

`sel` is a CSS selector inside the frame. It can match more than one element.

- `k.appear(sel, cue, { from: { x, y, scale }, dur, stagger })`: fade in
- `k.hide(sel, cue, { to: { x, y, scale }, dur })`: fade out
- `k.swap(outSel, inSel, cue)`: replace one object with another
- `k.draw(sel, cue, { dur, stagger })`: draw an SVG stroke
- `k.grow(sel, cue, { origin: "left" | "right" | "top" | "bottom" })`: scale in from an edge
- `k.highlight(sel, cue)`: ink fill, paper text
- `k.title(["problem", "1"])`: one cue per title word; `k.title(cue)` staggers them
- `k.set(sel, props)`: state at t = 0, e.g. hide a stage object
- `k.tl`, `k.at(cue)`, `k.q(sel)`, `k.els(sel)`: raw GSAP timeline, cue time, elements

An object with no move is visible for the whole frame.
