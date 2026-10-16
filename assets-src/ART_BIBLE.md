# Little Wonder World — Art Bible (hand-drawn v2)

Source of truth for the redesigned illustration set. Every sample and every future
asset follows this document. Samples live in `assets-src/samples/` as editable SVG.

## Palette
| Role | Hex | Use |
| --- | --- | --- |
| Cream paper | #FFF7E8 | backgrounds, highlights on light fills |
| Sky blue | #9EDDF5 | sky, water, cool accents |
| Leaf green | #9BCF8A | foliage, grass (deep #6FA96A for shadow) |
| Sunshine | #FFD66B | sun, hats, warm accents (deep #F2B84B) |
| Coral | #F58F83 | roofs, cars, blush, warm accents (deep #E2706A) |
| Lavender | #C5B5F0 | doors, cool accents (deep #A391DD) |
| Warm ink | #38454A | outlines, eyes (never pure black) |
Skin, bark and wood use warm tints: skin #F6CDAA / #D39A6F, bark #B98255.

## Line
- Outline colour: warm ink `#38454A` at 85–95% opacity, or a tinted ink for light
  fills (e.g. `#6F8FAE` on clouds).
- Outer contour 3.4–3.8 px, inner detail 2.2–2.6 px, at the sample's native size.
- Round caps and joins. Contours are hand-authored Béziers with small asymmetry,
  not geometric primitives.
- A `wc` displacement filter (scale 6) is applied to each artwork group. It gives
  the slightly uneven, hand-inked edge. Keep the scale at 4–7 so edges stay clean.

## Colour and texture
- Watercolour wash: fills run from a light to a deeper tone (linear gradient),
  with a darker edge on the lower/right side.
- Highlights: one soft white stroke or blob on the upper-left of each major shape.
- Shadows: lower-right, in a deeper tone of the same hue. Soft shadow under objects
  (blurred ellipse, 14% ink opacity).
- Paper grain: optional overlay for backgrounds only; never on sprites.

## Light
- Single light source from the upper-left. Highlights upper-left, shade lower-right.

## Shape language
- Rounded, organic silhouettes; slight asymmetry in every major shape.
- Each object gets its own silhouette and one signature detail (a cloud's puff
  count, a house's chimney, a car's roof curve, an animal's ear).
- Faces: two oval eyes with a white glint, coral blush, a small smile. Vary the
  eye shape, brow and mouth per character so no two faces are identical.

## Scale and sizes (native SVG viewBox = intended in-game size ×1)
| Category | Typical size |
| --- | --- |
| UI button | 128 × 128 |
| Small object | 128–256 on the long side |
| Medium object (car, animal, flower) | 256–512 |
| Large (tree, house, character) | 400–512 on the tall side |

## Naming
`<category>_<name>[_<state>].svg`, lower-case, underscores. Animated parts are
separate files: `car_red_wheel.svg`, `pip_arm_wave.svg`.

## Validation
- Valid XML with a correct `viewBox`, no external references, no embedded raster.
- Run `node scripts/art/validate-samples.mjs` (XML + viewBox check).
- Review gallery: `node scripts/art/build-gallery.mjs` → `scripts/art/gallery/index.html`
  (development only; not part of the game build).
