/**
 * Echo — OpenJarvis Core Status HUD
 * -----------------------------------------------------------------------
 * Persistent status panel: connection state, active inference backend
 * and model, terminal execution path, and memory index size. Subscribes
 * to the store and re-renders only the fields that changed.
 */

export class StatusHud {
  constructor(root) {
    this.root = root;
    this.els = {
      dot: root.querySelector('[data-hud="dot"]'),
      connection: root.querySelector('[data-hud="connection"]'),
      latency: root.querySelector('[data-hud="latency"]'),
      engine: root.querySelector('[data-hud="engine"]'),
      model: root.querySelector('[data-hud="model"]'),
      terminal: root.querySelector('[data-hud="terminal"]'),
      memory: root.querySelector('[data-hud="memory"]'),
      context: root.querySelector('[data-hud="context"]'),
      source: root.querySelector('[data-hud="source"]'),
      baseUrl: root.querySelector('[data-hud="baseurl"]'),
    };
  }

  render(state) {
    const { connection, system } = state;

    this.root.dataset.status = connection.status;
    this.els.dot.dataset.status = connection.status;

    const statusLabels = {
      connecting: 'Connecting…',
      online: 'Online',
      offline: 'Offline',
      demo: 'Demo Mode',
    };
    this.els.connection.textContent = statusLabels[connection.status] ?? connection.status;

    this.els.latency.textContent = connection.latencyMs != null ? `${connection.latencyMs} ms` : '—';
    this.els.engine.textContent = system.engine;
    this.els.model.textContent = system.activeModel;
    this.els.terminal.textContent = system.terminalPath;
    this.els.memory.textContent = system.memoryIndexSize;
    this.els.context.textContent = system.contextWindow;
    this.els.baseUrl.textContent = connection.baseUrl ?? '(not configured)';

    const sourceLabels = {
      live: 'Live telemetry',
      estimated: 'Estimated',
      unknown: 'Unavailable',
      demo: 'Simulated (demo mode)',
    };
    this.els.source.textContent = sourceLabels[system.statusSource] ?? '—';
    this.els.source.dataset.source = system.statusSource;
  }
}
