# Explainer kit

`kit.css` gives the look and `kit.js` the moves. `build.py` adds both to every frame. You write:

- `stage.html`: objects that most frames share. Write it once, before the frames.
- `frames/NN-slug.html`: the frame's own objects, then one `<script>` with cues. Example: `../templates/frame.html`.

## Layout

- Canvas 1920×1080, 40 px grid. Content goes between x 120 and x 1800, y 160 and y 840. The title sits above (`.k-title`, y 80, one `.k-word` per word). Captions use the area below y 880.
- Boxes (`k-box`, `k-dash`) snap to the 40 px grid: `left`, `top`, `width`, `height`. Everything else snaps to 20 px; for text in a box, use a 20 or 40 px inset.
- Columns between x 120 and x 1800:
  - 2: width 800, x 120 / 1000
  - 3: width 480, x 120 / 720 / 1320
  - 4: width 360, x 120 / 560 / 1000 / 1440
- Boxes in a row share their top and height. Gaps in a row or column are equal.
- Position with `left`, `top`, `width`, `height` in a `<style>` block, not inline.
- Use classes, not ids. Prefix with `f03-` (frame) or `st-` (stage).
- Lines and arrows: one `<svg class="k-svg" viewBox="0 0 1920 1080">`. Arrows start and end on box edges, at the middle of the row they connect. A path you `draw` needs `pathLength="1"`.

## Design

- Hierarchy by size: title 58 px; object names `k-serif` 40 px; values `k-mono` 28 px; labels and tags are smaller. Content text is never below 28 px.
- One diagram per frame, filling 40–60 % of the content area. No empty quarter, and no small cluster in a corner.
- Text on screen is labels, values and short terms. The narration is in the captions; do not repeat its sentences.
- Show a process as a diagram (objects, arrows, states), not as a row of text chips.
- Each object belongs to a box or a column. If it does not line up with something, move it.

`npm run build` warns about off-grid positions and small text. Fix all warnings.

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
