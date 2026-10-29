# Fox size standard — 2026-10-30

User selected Fox as the anatomical size reference for all 55 characters.
All Animals, People and Robots use the same size targets regardless of species,
age or real-world size. Animals keep their species features; robot bodies remain
mechanical. Only people have human clothing.

Targets in the expanded 640px cell:

- Core head: 188px wide × 120px tall, nominal x226–414, y402–522.
  Do not substitute species-dependent sizes or an equivalent-area target.
- Body: 140px wide × 54px tall, center x320, base y576.
- Ears, antlers, hats and projecting hair use the extra surrounding headroom.
- Wizard: measure the actual head/face, excluding BOTH hat and beard. Its face
  was enlarged separately through coherent image-generation edits; the beard
  overlaps the chest and always conceals the mouth, including reactions.
- Owl breast/wings, mammal chest/forepaws and robot chassis retain their own
  anatomy inside the same body envelope. No human torso template on animals.
- Preserve the complete coherent drawing in every frame. No head/body assembly,
  neck masks or separate part scaling.

The labelled fox-size-reference.png is the measurement diagram, not a runtime
image. Fox itself remains the selected original artwork. The previous raw set
is preserved locally under revisions/before-fox-uniform-20261029/.

Each raw PNG has 18 states in six columns and three rows. Each normalized PNG
and WebP is 3840×1920; the two runtime WebP atlases are 1920×1920. Larger cells
provide transparent room for appendages without shrinking the head or chest.
Runtime paints the canvas at twice the nominal display size; a 140px chest is
35 CSS pixels at size80, matching the previous artwork density.

Latest prompts/edits are in prompts/fox-uniform/. Packing translates complete
frames with one uniform scale per character. It never joins heads and bodies,
warps individual parts or masks a neck seam. Clear gutters are preferred;
staggered drawings may use rectangular whole-component extraction, with every
source pixel above alpha96 covered exactly once and no visible overlap.

The head target is reviewed visually against the Fox guide; automated checks
do not recognize anatomical landmarks hidden under hair, hats or beards.
Body anchors/neutral chest width and rendered positions have pixel measurements.
Actual validation and remaining limitations are recorded in docs/worklog.md.

Run from the repository root with the bundled sharp/canvas packages on NODE_PATH:

```powershell
$env:NTC_MASCOT_VERSION='ntc-v6'
node scripts/build-mascot-redraw.cjs
node scripts/review-mascot-uniform.cjs
node scripts/verify-mascot-redraw.cjs
```

The verifier compares source transforms, runtime atlas pixels and expanded PNGs;
it isolates each character in a child process to bound native canvas memory.
