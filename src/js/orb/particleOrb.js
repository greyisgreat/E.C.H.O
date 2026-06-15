/**
 * Echo — Particle Orb
 * -----------------------------------------------------------------------
 * Renders the signature visual: a double-helix "string" built from
 * thousands of independently-animated particles, rotating in 3D and
 * projected onto a 2D canvas with simple perspective math (no WebGL
 * dependency — keeps this file self-contained and fast to load).
 *
 * Each particle sits in a thin tube wrapped around one of two
 * counter-wound helical strands. A per-particle sinusoidal "breath" both
 * along the tube radius and along the strand gives the constant
 * warping / flowing look. Rotation speed, color stops, particle size,
 * and flash intensity are driven by `setState()`:
 *
 *   'idle'      — slow, calm rotation, deep purple -> electric blue
 *   'thinking'  — faster rotation, violet -> cyan, soft pulsing flashes
 *   'executing' — fastest rotation + forward "data flow" along the
 *                  strands, bright flashes, pink -> blue
 *   'offline'   — near-static, desaturated slate
 */

import { ORB } from '../config.js';

const TWO_PI = Math.PI * 2;

export class ParticleOrb {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = { ...ORB, ...options };
    this.state = 'idle';
    this.rotationY = 0;
    this.rotationX = 0;
    this.flowOffset = 0;
    this.flashClock = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this._buildParticles();
    this._handleResize = this._handleResize.bind(this);
    this._tick = this._tick.bind(this);

    this._handleResize();
    window.addEventListener('resize', this._handleResize);
  }

  _buildParticles() {
    const { particleCount, helixTurns, helixRadius, tubeRadius, particleSize } = this.opts;
    const particles = [];
    const halfCount = Math.floor(particleCount / 2);

    for (let strand = 0; strand < 2; strand++) {
      for (let i = 0; i < halfCount; i++) {
        const progress = i / halfCount; // 0..1 along the helix length
        const baseAngle = progress * helixTurns * TWO_PI + strand * Math.PI;
        const tubeAngle = Math.random() * TWO_PI;
        const tubeR = tubeRadius * (0.25 + Math.random() * 0.75);
        particles.push({
          progress,
          baseAngle,
          tubeAngle,
          tubeR,
          breathPhase: Math.random() * TWO_PI,
          breathSpeed: 0.0006 + Math.random() * 0.0014,
          size: particleSize.min + Math.random() * (particleSize.max - particleSize.min),
          flicker: Math.random(),
        });
      }
    }
    this.particles = particles;
  }

  _handleResize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.width = rect.width;
    this.height = rect.height;
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;
  }

  start() {
    if (this._raf) return;
    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._handleResize);
  }

  _tick(ts) {
    const dt = Math.min(48, ts - this._lastTs); // clamp to avoid huge jumps on tab-resume
    this._lastTs = ts;
    this._render(ts, dt);
    this._raf = requestAnimationFrame(this._tick);
  }

  _render(ts, dt) {
    const { ctx, width, height, dpr } = this;
    const colors = this.opts.colors[this.state] || this.opts.colors.idle;

    const speedMap = {
      idle: this.opts.baseRotationSpeed,
      thinking: this.opts.thinkRotationSpeed,
      executing: this.opts.execRotationSpeed,
      offline: this.opts.baseRotationSpeed * 0.08,
    };
    const motionScale = this.reducedMotion ? 0.18 : 1;
    const rotSpeed = (speedMap[this.state] ?? this.opts.baseRotationSpeed) * motionScale;

    this.rotationY += rotSpeed * dt;
    this.rotationX = Math.sin(ts * 0.00018) * 0.35;

    if (this.state === 'executing') {
      this.flowOffset += dt * 0.0026 * motionScale;
    } else if (this.state === 'thinking') {
      this.flowOffset += dt * 0.0009 * motionScale;
    }

    this.flashClock += dt;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Soft ambient glow behind the structure.
    const cx = width / 2;
    const cy = height / 2;
    const glowRadius = Math.min(width, height) * 0.46;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    glow.addColorStop(0, colors.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const { helixRadius, perspective, cameraDistance } = this.opts;
    const scale = Math.min(width, height) / 340; // keeps the orb proportional to its frame

    const sinY = Math.sin(this.rotationY);
    const cosY = Math.cos(this.rotationY);
    const sinX = Math.sin(this.rotationX);
    const cosX = Math.cos(this.rotationX);

    // Pre-compute a soft "thinking/executing" flash envelope (0..1).
    const flashEnvelope = this.state === 'idle' || this.state === 'offline'
      ? 0
      : 0.5 + 0.5 * Math.sin(this.flashClock * (this.state === 'executing' ? 0.006 : 0.0028));

    const projected = [];

    for (const p of this.particles) {
      // Breathing perturbation: the tube radius and the angle along the
      // strand both wobble over time, producing the "warping" feel.
      const breath = Math.sin(ts * p.breathSpeed + p.breathPhase);
      const radius = helixRadius + breath * (this.opts.tubeRadius * 0.6);
      const localTube = p.tubeR * (0.7 + 0.3 * Math.cos(ts * p.breathSpeed * 1.7 + p.breathPhase));

      const angle = p.baseAngle + this.flowOffset * TWO_PI * (this.state === 'executing' ? 6 : 2);

      // Point on the helix centerline.
      const helixX = Math.cos(angle) * radius;
      const helixZ = Math.sin(angle) * radius;
      const helixY = (p.progress - 0.5) * (radius * 2.1);

      // Offset into the tube around the centerline (approximate normal/binormal
      // by rotating the tube-angle relative to the helix tangent direction).
      const tubeX = Math.cos(p.tubeAngle + angle * 0.5) * localTube;
      const tubeY = Math.sin(p.tubeAngle + angle * 0.5) * localTube * 0.6;

      let x = helixX + tubeX;
      let y = helixY + tubeY;
      let z = helixZ;

      // Rotate around Y (primary spin) then X (subtle tumble).
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      // Perspective projection.
      const depth = cameraDistance + z2;
      const f = perspective / Math.max(1, depth);
      const px = cx + x1 * f * (scale * 0.01) * 100;
      const py = cy + y1 * f * (scale * 0.01) * 100;

      projected.push({ px, py, depth, p, mixT: p.progress });
    }

    // Depth-sort so nearer particles draw on top (cheap painter's algorithm).
    projected.sort((a, b) => b.depth - a.depth);

    for (const item of projected) {
      const { px, py, depth, p, mixT } = item;
      const depthFactor = clamp((depth - (this.opts.cameraDistance - this.opts.helixRadius - this.opts.tubeRadius)) /
        ((this.opts.helixRadius + this.opts.tubeRadius) * 2), 0, 1);
      const sizeFactor = 1.6 - depthFactor; // closer => bigger
      const radius = Math.max(0.35, p.size * sizeFactor * scale * 0.34);

      const baseAlpha = 0.25 + (1 - depthFactor) * 0.6;
      const flicker = this.state === 'idle' || this.state === 'offline'
        ? 1
        : 0.55 + 0.45 * Math.sin(ts * 0.004 + p.flicker * TWO_PI) * flashEnvelope + 0.45 * flashEnvelope;
      const alpha = clamp(baseAlpha * flicker, 0.04, 1);

      const color = mixColor(colors.a, colors.b, mixT, alpha);
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(px, py, radius, 0, TWO_PI);
      ctx.fill();
    }

    ctx.restore();
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function mixColor(hexA, hexB, t, alpha) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(3)})`;
}
