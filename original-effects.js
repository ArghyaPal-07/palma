// Original hand effects from the pre-redesign index.html.
// Drawing functions below are kept verbatim; the adapter fits their canvas into the new UI.
export function createOriginalEffects() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const video = { videoWidth: 640, videoHeight: 480 };
  const effects = { particles: [], trails: [], energy: [], sparks: [] };
		const HAND_CONNECTIONS = [
			// Thumb
			[0, 1], [1, 2], [2, 3], [3, 4],
			// Index
			[0, 5], [5, 6], [6, 7], [7, 8],
			// Middle
			[0, 9], [9, 10], [10, 11], [11, 12],
			// Ring
			[0, 13], [13, 14], [14, 15], [15, 16],
			// Pinky
			[0, 17], [17, 18], [18, 19], [19, 20],
			// Cross links (knuckles)
			[5, 9], [9, 13], [13, 17], [17, 5]
		];

		function toPx([x, y]) {
			// Video and canvas are mirrored with CSS. Use raw coordinates.
			return [x * video.videoWidth, y * video.videoHeight];
		}

		function drawHUDBase() {
			// Bottom-left grid and cube
			const gridX = 24, gridY = video.videoHeight - 120;
			ctx.save();
			ctx.translate(gridX, gridY);
			ctx.strokeStyle = "#6178ff";
			ctx.lineWidth = 1.5;
			ctx.shadowColor = "rgba(97,120,255,0.6)";
			ctx.shadowBlur = 6;
			for (let i = 0; i <= 6; i++) {
				ctx.beginPath();
				ctx.moveTo(0, i * 12);
				ctx.lineTo(72, i * 12);
				ctx.stroke();
			}
			for (let i = 0; i <= 6; i++) {
				ctx.beginPath();
				ctx.moveTo(i * 12, 0);
				ctx.lineTo(i * 12 + 24, -24);
				ctx.stroke();
			}
			// Cube
			ctx.strokeStyle = "#ff6a3d";
			ctx.beginPath();
			ctx.rect(96, -72, 60, 60);
			ctx.stroke();
			ctx.beginPath();
			ctx.rect(114, -90, 60, 60);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(96, -72); ctx.lineTo(114, -90);
			ctx.moveTo(156, -72); ctx.lineTo(174, -90);
			ctx.moveTo(156, -12); ctx.lineTo(174, -30);
			ctx.moveTo(96, -12); ctx.lineTo(114, -30);
			ctx.stroke();
			ctx.restore();
		}

		function drawRing(x, y, r, rotation, color) {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(rotation);
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.lineCap = "round";
			ctx.shadowColor = "rgba(255,255,255,0.7)";
			ctx.shadowBlur = 4;
			for (let i = 0; i < 3; i++) {
				ctx.beginPath();
				ctx.arc(0, 0, r + i * 4, 0.8 * Math.PI, 1.6 * Math.PI);
				ctx.stroke();
			}
			// Tick marks
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2;
				ctx.beginPath();
				ctx.moveTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
				ctx.lineTo(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12));
				ctx.stroke();
			}
			ctx.restore();
		}

		function drawFingertipGizmo(x, y, t) {
			drawRing(x, y, 10, t * 0.04, "#ffffff");
			ctx.fillStyle = "#fff";
			ctx.beginPath();
			ctx.arc(x, y, 2.5, 0, Math.PI * 2);
			ctx.fill();
		}

		function centroid(points) {
			let sx = 0, sy = 0;
			for (const p of points) { sx += p[0]; sy += p[1]; }
			return [sx / points.length, sy / points.length];
		}

		// Distance between two MediaPipe landmarks
		function distance(a, b) {
			const dx = a.x - b.x;
			const dy = a.y - b.y;
			return Math.sqrt(dx * dx + dy * dy);
		}


		// Detect a two-hand heart gesture
		function isHeartGesture(hands) {
			if (!hands || hands.length < 2) return false;

			const left = hands[0];
			const right = hands[1];

			// Thumb tips
			const leftThumb = left[4];
			const rightThumb = right[4];

			// Index fingertips
			const leftIndex = left[8];
			const rightIndex = right[8];

			// Thumb tips should be close together
			const thumbDistance = distance(leftThumb, rightThumb);

			// Index fingertips should be close together
			const indexDistance = distance(leftIndex, rightIndex);

			// The four fingertips should form a roughly heart-shaped area
			const leftWidth = distance(leftThumb, leftIndex);
			const rightWidth = distance(rightThumb, rightIndex);

			// Fingers must be reasonably close
			const fingersClose =
				thumbDistance < 0.12 &&
				indexDistance < 0.12;

			// Prevent random touching fingers from triggering it
			const shapeValid =
				leftWidth > 0.025 &&
				rightWidth > 0.025 &&
				leftWidth < 0.30 &&
				rightWidth < 0.30;

			return fingersClose && shapeValid;
		}


		// Get the center of the heart gesture
		function getHeartCenter(hands) {
			const points = [
				hands[0][4],
				hands[0][8],
				hands[1][4],
				hands[1][8]
			];

			const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
			const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;

			return toPx([x, y]);
		}


		// Draw a glowing heart
		function drawHeart(x, y, size, t) {
			ctx.save();

			const pulse = 1 + Math.sin(t * 0.12) * 0.08;
			size *= pulse;

			ctx.translate(x, y);

			// Glow
			ctx.shadowColor = "#ff2d75";
			ctx.shadowBlur = 25;

			ctx.strokeStyle = "#ff4d88";
			ctx.lineWidth = 4;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";

			ctx.beginPath();

			ctx.moveTo(0, size * 0.8);

			ctx.bezierCurveTo(
				-size * 1.2, 0,
				-size * 0.9, -size,
				0, -size * 0.35
			);

			ctx.bezierCurveTo(
				size * 0.9, -size,
				size * 1.2, 0,
				0, size * 0.8
			);

			ctx.stroke();

			// Inner glow
			ctx.shadowBlur = 10;
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;

			ctx.beginPath();

			ctx.moveTo(0, size * 0.8);

			ctx.bezierCurveTo(
				-size * 1.2, 0,
				-size * 0.9, -size,
				0, -size * 0.35
			);

			ctx.bezierCurveTo(
				size * 0.9, -size,
				size * 1.2, 0,
				0, size * 0.8
			);

			ctx.stroke();

			// Heart particles
			for (let i = 0; i < 3; i++) {
				const angle = t * 0.03 + i * 2.1;

				const px = Math.cos(angle) * size * 1.5;
				const py = Math.sin(angle) * size * 1.2;

				ctx.fillStyle = "#ff6b9d";
				ctx.shadowColor = "#ff2d75";
				ctx.shadowBlur = 12;

				ctx.beginPath();
				ctx.arc(px, py, 2, 0, Math.PI * 2);
				ctx.fill();
			}

			ctx.restore();
		}



		function drawPalmHUD(landmarks, t) {
			const mcpIndices = [0, 5, 9, 13, 17];
			const pts = mcpIndices.map(i => toPx([landmarks[i].x, landmarks[i].y]));
			const [cx, cy] = centroid(pts);
			drawRing(cx, cy, 22, t * 0.03, "#ffffff");
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.lineCap = "round";
			ctx.shadowColor = "rgba(255,255,255,0.6)";
			ctx.shadowBlur = 4;
			ctx.beginPath();
			for (let i = 0; i < pts.length; i++) {
				const [x, y] = pts[i];
				ctx.moveTo(cx, cy);
				ctx.lineTo(x, y);
			}
			ctx.stroke();

			// Readout text
			ctx.font = "14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
			ctx.fillStyle = "#ffffff";
			ctx.fillText(`rotation ${Math.floor((t % 360))}`, cx - 40, cy + 48);
		}

		function drawSkeleton(landmarks) {
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 2;
			ctx.lineCap = "round";
			ctx.shadowColor = "rgba(255,255,255,0.6)";
			ctx.shadowBlur = 6;
			ctx.beginPath();
			for (const [a, b] of HAND_CONNECTIONS) {
				const pa = toPx([landmarks[a].x, landmarks[a].y]);
				const pb = toPx([landmarks[b].x, landmarks[b].y]);
				ctx.moveTo(pa[0], pa[1]);
				ctx.lineTo(pb[0], pb[1]);
				
				// Add trail effect
				effects.trails.push({
					x: pa[0], y: pa[1],
					life: 30,
					alpha: 0.8
				});
			}
			ctx.stroke();
		}

		function drawJointDots(landmarks, t) {
			ctx.fillStyle = "#ffffff";
			ctx.shadowColor = "rgba(255,255,255,0.85)";
			ctx.shadowBlur = 8;
			for (let i = 0; i < landmarks.length; i++) {
				const [x, y] = toPx([landmarks[i].x, landmarks[i].y]);
				const r = (i % 4 === 0 || i === 0) ? 2.8 : 2.0;
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
				if ([4,8,12,16,20,0,5,9,13,17].includes(i)) {
					drawRing(x, y, 8, t * 0.05 + i * 0.2, "#ffffff");
					// Add energy particles around fingertips
					if (Math.random() < 0.3) {
						effects.energy.push({
							x: x + (Math.random() - 0.5) * 20,
							y: y + (Math.random() - 0.5) * 2,
							vx: (Math.random() - 0.5) * 2,
							vy: (Math.random() - 0.5) * 2,
							life: 60,
							color: `hsl(${200 + Math.random() * 60}, 80%, 70%)`
						});
					}
				}
			}
		}

		const prevByHandIndex = new Map();
		function smoothLandmarks(raw, handIndex) {
			const alpha = 0.35;
			const prev = prevByHandIndex.get(handIndex) || raw;
			const smoothed = raw.map((p, i) => ({
				x: prev[i] ? prev[i].x * (1 - alpha) + p.x * alpha : p.x,
				y: prev[i] ? prev[i].y * (1 - alpha) + p.y * alpha : p.y,
				z: p.z
			}));
			prevByHandIndex.set(handIndex, smoothed);
			return smoothed;
		}

		function drawMadeForYou(t) {
			const x = video.videoWidth / 2;
			const y = video.videoHeight - 45;

			ctx.save();

			// Position
			ctx.translate(x, y);

			// Correct mirror effect
			ctx.scale(-1, 1);

			// Same pulse style as the heart
			const pulse = 1 + Math.sin(t * 0.12) * 0.08;
			ctx.scale(pulse, pulse);

			ctx.textAlign = "center";
			ctx.textBaseline = "top";

			// Same font style
			ctx.font = "32px 'Segoe UI', Times New Roman, sans-serif";

			// Pink outer glow — same as heart
			ctx.shadowColor = "#ff2d75";
			ctx.shadowBlur = 25;

			ctx.strokeStyle = "#ff4d88";
			ctx.lineWidth = 2;

			// Outer glowing text
			ctx.fillStyle = "#ff4d88";
			ctx.fillText("Made for You", 0, 0);

			// Bright inner glow
			ctx.shadowBlur = 10;
			ctx.fillStyle = "#ffffff";
			ctx.fillText("Made for You", 0, 0);

			// Small pink highlight
			ctx.shadowBlur = 5;
			ctx.fillStyle = "#ffd6e8";
			ctx.fillText("Made for You", 0, 0);

			ctx.restore();
		}

		function updateEffects() {
			// Update energy particles
			effects.energy = effects.energy.filter(p => {
				p.x += p.vx;
				p.y += p.vy;
				p.life--;
				return p.life > 0;
			});
			
			// Update trails
			effects.trails = effects.trails.filter(t => {
				t.life--;
				t.alpha *= 0.95;
				return t.life > 0 && t.alpha > 0.1;
			});
			
			// Add ambient particles
			if (Math.random() < 0.1) {
				effects.particles.push({
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height,
					vx: (Math.random() - 0.5) * 0.5,
					vy: (Math.random() - 0.5) * 0.5,
					life: 120,
					size: Math.random() * 2 + 1
				});
			}
			
			// Update ambient particles
			effects.particles = effects.particles.filter(p => {
				p.x += p.vx;
				p.y += p.vy;
				p.life--;
				return p.life > 0 && p.x > 0 && p.x < canvas.width && p.y > 0 && p.y < canvas.height;
			});
		}
		
		function drawEffects() {
			// Draw energy particles
			effects.energy.forEach(p => {
				ctx.save();
				ctx.globalAlpha = p.life / 60;
				ctx.fillStyle = p.color;
				ctx.shadowColor = p.color;
				ctx.shadowBlur = 10;
				ctx.beginPath();
				ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			});
			
			// Draw trails
			effects.trails.forEach(t => {
				ctx.save();
				ctx.globalAlpha = t.alpha;
				ctx.fillStyle = "#00ffff";
				ctx.shadowColor = "#00ffff";
				ctx.shadowBlur = 8;
				ctx.beginPath();
				ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			});
			
			// Draw ambient particles
			effects.particles.forEach(p => {
				ctx.save();
				ctx.globalAlpha = p.life / 120;
				ctx.fillStyle = "#ffffff";
				ctx.shadowColor = "#ffffff";
				ctx.shadowBlur = 4;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			});

			
		}

  let ringsVisible = true;
  const originalDrawRing = drawRing;
  drawRing = (...args) => { if (ringsVisible) originalDrawRing(...args); };

  return {
    canvas,
    previous: prevByHandIndex,
    smooth: smoothLandmarks,
    isHeartGesture,
    reset() {
      prevByHandIndex.clear();
      effects.particles = []; effects.trails = []; effects.energy = []; effects.sparks = [];
    },
    render(hands, time, { width = 640, height = 480, mirrored = true, skeleton = true, rings = true, particles = true } = {}) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (video.videoWidth !== width || video.videoHeight !== height || canvas.width !== Math.floor(width * dpr)) {
        video.videoWidth = width; video.videoHeight = height;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        effects.particles = []; effects.trails = []; effects.energy = []; effects.sparks = [];
      }
      ringsVisible = rings;
      const t = time * 0.06;
      // Same frame order and timing as the original animation loop.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawHUDBase();
      if (particles) { updateEffects(); drawEffects(); }
      for (const hand of hands) {
        if (skeleton) drawSkeleton(hand);
        if (rings) drawPalmHUD(hand, t);
        drawJointDots(hand, t);
        if (rings) [4, 8, 12, 16, 20].forEach(i => {
          const [x, y] = toPx([hand[i].x, hand[i].y]);
          drawFingertipGizmo(x, y, t);
        });
      }
      // The original heart gesture is automatic, independent of the selected demo pose.
      if (isHeartGesture(hands)) {
        const [x, y] = getHeartCenter(hands);
        drawHeart(x, y, 70, t);
        // The original text counteracts a mirrored canvas. Keep it readable when mirroring is off too.
        if (!mirrored) { ctx.save(); ctx.translate(width, 0); ctx.scale(-1, 1); }
        drawMadeForYou(t);
        if (!mirrored) ctx.restore();
      }
      if (!particles) { effects.particles = []; effects.trails = []; effects.energy = []; }
      return canvas;
    }
  };
}
