# Discipline — 12-week plan tracker

Run it: double-click `start.command`, or

```bash
cd ~/Documents/essentials/discipline
node server.js
```

Then open http://localhost:4747 (Node 22+; uses the built-in `node:sqlite`, no installs).

- **Tracker** (`/`): today's checklist with exact steps, the "Right now" card, today's workout with two-photo crossfade, set logging, consistency heatmap.
- **Printable master sheet** (`/print.html`): daily routine, weekend, weekly schedule, hair/face/body matrix, workouts A–G with sets per phase, products, food targets, honest notes. Use Print → Save as PDF.

## Where to edit
- `public/schedule.js` — start date (`START`, currently 2026-11-17), daily routine, hair/night-face matrices.
- `public/exdb.js` — exercises, sets per phase, sessions A–G, posture and finisher blocks.
- Both the tracker and the print sheet read these two files, so edit once.
- Check-ins live in `discipline.db` (never deleted by code changes).

## Animations
Every exercise is an original animated figure drawn in code (no third-party media, so it is safe to release). `public/anims.js` holds, per exercise, a start and working pose, the muscles lit (red = main, amber = helper) and props; `public/figure.js` solves the joints and renders SVG. To fix or add a move, edit its two poses in `anims.js`.
