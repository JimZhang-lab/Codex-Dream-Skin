# Artoria Classic look mechanics

Artoria is a humanoid chibi knight. Her feet, skirt hem, and lower torso remain the stable anchor while the eyes lead the gaze, the eyelids and bangs follow, and the head/neck turn subtly in the requested viewer/screen direction. Preserve the original pixel-art eye construction and facial proportions; do not add replacement googly eyes or slide isolated pupils across a fixed eye white. The crown, blonde side locks, navy bow, armor, and sword must remain the same identity and palette.

The sword is a rigid, attached prop. It follows Artoria's hand and shoulder during turns, matching the established running sprites: at a screen-right profile it trails on image-left, and at a screen-left profile it trails on image-right. It may become side-on or partly occluded but never detaches, changes design, or swaps independently of the body. The lower body stays planted; only the upper body, head, face, and attached prop participate in looking.

## Cardinal pose families

- `000` up: feet and skirt hem stay planted; chin and face tip upward; both original eyes and upper eyelids visibly aim toward the top of the cell; crown remains centered with only a restrained neck lift; sword stays attached and nearly neutral.
- `090` screen-right: eyes and nose lead toward the viewer-right edge; head and neck yaw right with the viewer-left cheek/hair becoming slightly less visible; the attached sword follows the turn and trails at image-left, consistent with the existing running-right sprites.
- `180` down: chin lowers toward the chest; original eyelids and eyes aim down; bangs cover a little more of the upper face; torso compresses subtly while feet, skirt hem, crown, and sword attachment remain registered.
- `270` screen-left: eyes and nose lead toward the viewer-left edge; head and neck yaw left with the viewer-right cheek/hair becoming slightly less visible; the upper torso follows subtly while the attached sword trails at image-right, consistent with the existing running-left sprites.

The diagonal cells interpolate these four families as an even clockwise arc: `022.5`, `045`, and `067.5` move from up toward screen-right; `112.5`, `135`, and `157.5` move from screen-right toward down; `202.5`, `225`, and `247.5` move from down toward screen-left; `292.5`, `315`, and `337.5` move from screen-left back toward up. No cell is front-facing-neutral, backtracks, or jumps between cardinal families. Row 10 starts one step after row 9 at `180`; its `337.5` pose is one step before the approved `000` pose in row 9.

## Motion budget

Each 22.5-degree step changes the eye aim, head yaw/pitch, eyelid shape, hair follow-through, and attached-sword follow-through by roughly one eighth of the adjacent cardinal difference. Keep the feet/lower-body anchor within about 1 pixel of the neutral baseline, keep crown and skirt scale constant, and keep any sword-tip shift small and continuous. Preserve volume and silhouette; never rotate, skew, or affine-tilt the entire sprite to fake looking.
