---
name: reel-thumbnail
description: Make Instagram Reels covers (1080x1920, 9:16) in the style of the reference thumbnails in references/: one face, one big number or short claim, one accent colour, an app icon or a simple diagram. Use when the user asks for a reel cover, reel thumbnail, Instagram cover image, or wants to turn a photo or a video frame into a cover.
---

# Reel thumbnail

Builds a 1080x1920 PNG cover from a photo of the speaker plus a short JSON spec, using `render.py` in this folder. Fonts (Montserrat, Anton, Bebas Neue, all OFL) are bundled in `fonts/`, so output looks the same on any machine with Python 3 and Pillow.

Look at the five images in `references/` before designing. They are YouTube thumbnails (16:9) except `05`, which is already vertical. The job is to keep their tactics and re-stack them for a tall frame.

## Size and safe zones

| What | Size / position | Why |
|---|---|---|
| Canvas | 1080x1920 (9:16) | Reels cover size |
| Profile grid tile | centre 1080x1440, y 240 to 1680 | Instagram shows a 3:4 crop on the profile grid. Anything above y 240 or below y 1680 is cut there. |
| Reels caption bar | bottom 420 px, y 1500 to 1920 | Username, caption and audio sit on top of the first frame in the feed |
| Action buttons | right 150 px, lower half | Like / comment / share column |

Working rule: every word that matters sits between **y 260 and y 1480**, and nothing important goes in the right 150 px below mid-height. The face can extend past those lines. Text cannot.

`render.py ... --preview` writes a second file with these zones drawn on, green for the grid crop and yellow for the UI. Check it every time.

## What the references have in common

1. **One face, looking at the camera, centred or at the edges.** Expression matches the claim (smile for money/success, open mouth for argument). Cut out from the background and shadowed so it pops.
2. **Two to six words.** `$500,000 / from a 13-page Ebook`, `NO SALES NO COMPANY`, `$280 /DAY`, `Thank Me Later`, `SEEDANCE 2.5 / CHEAPEST WAY TO MAKE AI VIDEOS`. The last one is the upper limit.
3. **One hero element that is not text**: a number, an app icon, or a diagram (dashed arrow, numbered steps).
4. **Heavy sans, white, with a soft drop shadow.** Either geometric black weight (Montserrat 900) or condensed caps (Anton). Never a thin or script face.
5. **One accent colour per thumbnail**, used on a box, a brush stroke or an underline behind one phrase: magenta `/DAY`, blue `COMPANY`, red `MAKE AI VIDEOS`, red underline under `Later`.
6. **Depth by layering.** The big number sits *behind* the head in `01` and the title behind the head in `05`. Use `"layer": "back"` for that.
7. **Background is quiet.** Blurred room, dark studio, or a colour wash. It never competes with the text.

## Five layouts

Each has a working spec in `examples/` with a rendered PNG next to it. Copy the closest one and edit it.

| File | Pattern | Use for |
|---|---|---|
| `01-number-behind-head` | Huge number at top behind head, icon tile on one side, two-line claim at the bottom | Income or result claims |
| `02-stacked-caps-brush` | Three stacked condensed caps lines, last word on a paint stroke, name label | Quotes, hot takes, interviews |
| `03-icon-arrow-price` | Price on top, unit in a coloured box, app icon low left, dashed arrow from icon to price | "Tool X makes Y" |
| `04-progress-steps` | Numbered milestones climbing red to green behind the head, title with underline | Step lists, roadmaps, "do this in order" |
| `05-vertical-title-boxed-cta` | Title behind head, two tool icons tilted either side, white line plus boxed line at bottom | Tool tutorials, comparisons |

Translating the landscape references to 9:16: text that sat left and right of the face moves above and below it. Face goes in the middle third (head roughly y 600 to 1100), headline in the top third, payoff line in the lower third above y 1480.

## Workflow

1. **Get the inputs.** A photo or video frame of the speaker (`ffmpeg -ss 00:00:03 -i reel.mp4 -frames:v 1 frame.jpg` grabs one), the reel's topic, and the logo of any tool mentioned. Ask for these if they are missing. Do not invent a number or a claim the reel does not make.
2. **Cut out the subject** to a transparent PNG. Options in order: `pip install rembg && rembg i frame.jpg subject.png`; the Higgsfield `remove_background` tool if it is connected; or skip the cutout and use the photo as the background with `gradients` to darken the text areas.
3. **Write the headline.** 2 to 6 words, one number if there is one. Split into a hook (top) and a payoff (bottom). Pick the single phrase that gets the accent box.
4. **Copy an example spec**, swap paths and text, run:
   ```bash
   python3 .claude/skills/reel-thumbnail/render.py spec.json cover.png --preview
   ```
5. **Look at both outputs** with the Read tool. Check: text inside the safe zone, text readable at 1/4 size (shrink it and look), face not covered by text, only one accent colour.
6. Send the PNG to the user. Offer 2 or 3 variants (different layout or headline) only if asked or if the first one has an obvious alternative.

## Spec reference

Coordinates are pixels on the 1080x1920 canvas. Paths resolve relative to the spec file.

```jsonc
{
  "background": {"image": "bg.jpg", "blur": 8, "brightness": 0.9, "saturation": 1, "focus": [0.5, 0.5], "color": "#1a1a1a"},
  "wash": {"colors": ["#E53935", "#43A047"], "direction": "horizontal", "opacity": 0.35},   // colour tint over the bg
  "gradients": [{"edge": "bottom", "height": 0.4, "color": "#000", "opacity": 0.6}],      // edge: top|bottom|left|right
  "vignette": 0.5,
  "subject": {"image": "subject.png", "height": 1250, "cx": 540, "bottom": 1920,
              "rim": "#ffffff", "rim_width": 9, "shadow": {"blur": 30, "opacity": 0.45, "offset": [0, 14]}},
  "elements": [ ... ]   // drawn in order; "layer": "back" puts an element behind the subject
}
```

Element types:

- `text`: `text` (use `\n` for lines), `font` (`montserrat` | `anton` | `bebas`), `weight` (Montserrat only, 100 to 900), `size`, `max_width` (shrinks to fit, default 960), `x`, `y`, `align` (`center` | `left` | `right`), `valign` (`top` | `middle` | `bottom`, relative to `y`), `line_spacing`, `color`, `colors` (per line), `rotate`, `stroke` `{width, color}`, `shadow` `{blur, opacity, offset}`, and accents that take an optional `lines` list to target specific lines:
  - `box` `{color, text_color, radius, pad: [x, y], gap}`
  - `brush` `{color}` paint-stroke highlight
  - `underline` `{color, width, strokes, start, end, offset}` hand-drawn double line
- `image`: `src`, `cx`, `cy`, `w`, `rotate`, `radius` (corner radius as a fraction of size, 0.22 gives an app-icon shape), `shadow`.
- `badge`: an app-icon tile drawn from scratch when there is no logo file: `text`, `color`, `text_color`, `w`, `cx`, `cy`, `rotate`, `text_scale`. Use the real logo with `image` whenever you have it; a badge is a stand-in.
- `arrow`: dashed curve with a head. `from`, `to`, `bend` (negative flips the curve), `width`, `dash: [on, off]`, `color`, `head`.
- `steps`: numbered circles on a colour-shifting line. `points`, `colors`, `radius`, `width`, `start`, `hide` (indexes to leave without a circle, e.g. where the head covers them).

## Mistakes to avoid

- More than one accent colour, or boxes on every line. The box works because it is the only one.
- Headline over 6 words. At grid size it becomes grey texture.
- Text in the bottom 420 px. It ends up under the caption in the feed and is cut from the grid.
- Thin outline instead of shadow on white text over a light background. Darken the area with a `gradients` entry instead.
- Copying the reference text or faces. The references show layout and tactics only.
- Numbers or results the reel does not back up. If the user's reel says "$280 a day in month three", the cover says that, not "$280/day" with no context, unless the user chooses the shorter version.
