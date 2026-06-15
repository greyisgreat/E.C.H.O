/**
 * Echo — Holographic Diagrams Layer
 * -----------------------------------------------------------------------
 * A small, self-contained node-link diagram renderer drawn as SVG so it
 * stays crisp at any zoom level and can be styled entirely with CSS
 * (glow filters, gradients). Used whenever OpenJarvis is asked to "map"
 * or "analyze" a codebase / system — Echo renders whatever node/edge
 * graph comes back.
 *
 * Layout: a deterministic force-directed-ish layout computed once on
 * `render()` via a handful of relaxation passes (no external dependency).
 * Good enough for the small graphs (5-40 nodes) this panel is meant for.
 */

const NS = 'http://www.w3.org/2000/svg';

export class DiagramCanvas {
  constructor(root) {
    this.root = root;
    this.svg = root.querySelector('[data-diagram="svg"]');
    this.captionEl = root.querySelector('[data-diagram="caption"]');
  }

  /**
   * @param {{nodes: {id:string, label:string, kind?:string}[], edges:{from:string,to:string,label?:string}[], caption?:string}} graph
   */
  render(graph) {
    const { nodes, edges, caption } = graph;
    this._layout(nodes, edges);
    this._draw(nodes, edges);
    if (this.captionEl) this.captionEl.textContent = caption || '';
  }

  renderDefault() {
    this.render({
      caption: 'Echo \u2194 OpenJarvis reference architecture',
      nodes: [
        { id: 'echo', label: 'Echo UI', kind: 'ui' },
        { id: 'api', label: 'jarvis serve\n(OpenAI-compatible)', kind: 'api' },
        { id: 'agent', label: 'Agent Loop\n(ReAct / CodeAct)', kind: 'agent' },
        { id: 'engine', label: 'Inference Engine\n(Ollama / vLLM)', kind: 'engine' },
        { id: 'mcp', label: 'MCP Tools', kind: 'tool' },
        { id: 'fs', label: 'Filesystem', kind: 'tool' },
        { id: 'os', label: 'OS Control', kind: 'tool' },
        { id: 'memory', label: 'Memory Index', kind: 'data' },
      ],
      edges: [
        { from: 'echo', to: 'api', label: 'HTTP / SSE' },
        { from: 'api', to: 'agent' },
        { from: 'agent', to: 'engine', label: 'prompts' },
        { from: 'agent', to: 'mcp', label: 'tool calls' },
        { from: 'mcp', to: 'fs' },
        { from: 'mcp', to: 'os' },
        { from: 'agent', to: 'memory', label: 'retrieve / write' },
      ],
    });
  }

  _layout(nodes, edges) {
    const width = 640;
    const height = 360;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.36;

    // Seed positions on a circle for a stable starting layout.
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      n.x = cx + Math.cos(angle) * r;
      n.y = cy + Math.sin(angle) * r;
    });

    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

    // A few relaxation passes: edges pull connected nodes together,
    // all pairs repel slightly to avoid overlap.
    for (let pass = 0; pass < 60; pass++) {
      for (const e of edges) {
        const a = byId[e.from];
        const b = byId[e.to];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const target = 170;
        const force = (dist - target) * 0.02;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.x += fx; a.y += fy;
        b.x -= fx; b.y -= fy;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = 130;
          if (dist < minDist) {
            const force = (minDist - dist) * 0.05;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.x -= fx; a.y -= fy;
            b.x += fx; b.y += fy;
          }
        }
      }
    }

    // Clamp into bounds with padding.
    const pad = 70;
    nodes.forEach((n) => {
      n.x = clamp(n.x, pad, width - pad);
      n.y = clamp(n.y, pad, height - pad);
    });

    this._bounds = { width, height };
  }

  _draw(nodes, edges) {
    const { width, height } = this._bounds;
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.innerHTML = '';

    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = `
      <filter id="diagramGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.7" />
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.7" />
      </linearGradient>
    `;
    this.svg.appendChild(defs);

    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

    const edgeLayer = document.createElementNS(NS, 'g');
    edgeLayer.setAttribute('class', 'diagram-edges');
    for (const e of edges) {
      const a = byId[e.from];
      const b = byId[e.to];
      if (!a || !b) continue;

      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', a.x);
      line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x);
      line.setAttribute('y2', b.y);
      line.setAttribute('stroke', 'url(#edgeGradient)');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('class', 'diagram-edge');
      edgeLayer.appendChild(line);

      if (e.label) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const text = document.createElementNS(NS, 'text');
        text.setAttribute('x', mx);
        text.setAttribute('y', my - 6);
        text.setAttribute('class', 'diagram-edge-label');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = e.label;
        edgeLayer.appendChild(text);
      }
    }
    this.svg.appendChild(edgeLayer);

    const nodeLayer = document.createElementNS(NS, 'g');
    nodeLayer.setAttribute('class', 'diagram-nodes');
    for (const n of nodes) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', `diagram-node node-${n.kind || 'default'}`);
      g.setAttribute('transform', `translate(${n.x}, ${n.y})`);

      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('r', '34');
      circle.setAttribute('filter', 'url(#diagramGlow)');
      g.appendChild(circle);

      const lines = String(n.label).split('\n');
      lines.forEach((lineText, i) => {
        const text = document.createElementNS(NS, 'text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('y', (i - (lines.length - 1) / 2) * 13 + 4);
        text.textContent = lineText;
        g.appendChild(text);
      });

      nodeLayer.appendChild(g);
    }
    this.svg.appendChild(nodeLayer);
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
