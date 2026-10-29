# Palma

A browser-based hand playground. Turn an open palm, finger movement, or a two-hand heart into live visual effects. Built with HTML, CSS, Canvas, and MediaPipe Hand Landmarker, with no build step.

## Run locally

From this directory:

```sh
python -m http.server 8080
```

Open [localhost:8080](http://localhost:8080). Camera access requires localhost or HTTPS. An internet connection is needed to load the font and the MediaPipe runtime and model on the first camera start.

## Playground

- **Enable camera** starts hand tracking for up to two hands, with 21 landmarks per hand. Stop camera releases the webcam. Loading can be cancelled, and permission and device errors have a retry state.
- **Explore demo** runs illustrative hand poses without requesting camera access or downloading the tracking model. Demo statistics stay unavailable rather than pretending to be live measurements.
- The original effects run together: white glowing skeleton and rings, palm HUD and rotation readout, blue energy particles, cyan trails, ambient particles, and the grid and cube. The original two-hand heart gesture automatically draws the pink glowing heart and “Made for You” message in every mode. The gesture buttons select illustrative demo poses.
- Optional layer switches hide the skeleton, rings, or particles; all are enabled by default. Reset restores the original combination.
- **Quality** requests 960 × 720 video. **Speed** requests 640 × 480. Both target 30 fps; the camera may negotiate a different resolution or frame rate.
- Mirror the camera, save a PNG snapshot, or open the preview fullscreen. The gesture guide works with the keyboard and closes with Escape.

The interface responds to desktop, tablet, and phone widths. It respects reduced-motion preferences. Camera video and hand tracking stay in the browser; snapshots are downloaded only when requested. The existing Vercel Analytics integration remains separate from the camera pipeline.

## Files

- `index.html` — accessible app layout, controls, and gesture guide.
- `styles.css` — responsive Palma visual system.
- `app.js` — controls, camera lifecycle, model loading, and telemetry.
- `effects.js` — idle illustration and adapter for the original effects.
- `original-effects.js` — verbatim drawing, smoothing, particle, and gesture functions from the original code.
- `assets/favicon.svg` — Palma hand mark.

Deploy these files to any static host with HTTPS. No framework, bundler, or additional runtime dependencies are required. MediaPipe uses GPU inference when available and falls back to CPU.
