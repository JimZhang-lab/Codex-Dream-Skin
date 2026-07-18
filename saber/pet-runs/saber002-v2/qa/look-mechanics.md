# saber002 look mechanics

`saber002` is a compact humanoid swordmistress. Her planted lower skirt and feet stay anchored near the baseline. Her eyes lead attention first, followed by a small head-and-neck turn and a restrained upper-torso follow-through; braided hair and the bow lag by a very small, continuous amount. The dark saber remains gripped/secured on the same side of the body and follows the hand and hip naturally, becoming slightly more side-on or occluded by the torso as she turns. It never detaches or becomes a new prop.

## Motion budget

Each 22.5-degree advance moves the eyes, head angle, shoulder line, hair bow, and sword angle by one small even increment. The lower skirt/feet baseline is stable. Do not rotate or skew the full sprite and do not stretch facial features. Preserve the canonical face, dress, and red-rune saber construction.

## Cardinal pose families (viewer/screen coordinates)

- **000 up:** pupils and eyelids clearly direct upward, chin rises slightly, crown/braid reads a little more prominently, and the sword stays low and anchored.
- **090 screen-right:** nose tip, pupils, head, and shoulders turn distinctly toward the viewer's right; the right side of the face becomes more visible and the sword/hilt follows with a slight rightward lag while attached.
- **180 down:** pupils and eyelids point down, chin dips, upper torso inclines forward slightly, and the sword remains attached near the hip without obscuring the face.
- **270 screen-left:** nose tip, pupils, head, and shoulders turn distinctly toward the viewer's left; the left side of the face becomes more visible and the saber shifts continuously with the held side without flipping or detaching.

The diagonal poses interpolate these cardinal families continuously around the loop. `337.5` lands one small step before the approved `000` pose; `157.5` lands one small step before `180`.
