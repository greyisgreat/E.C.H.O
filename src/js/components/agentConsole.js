/**
 * Echo — Agent Control Stream
 * -----------------------------------------------------------------------
 * A rolling, monospace, matrix-tinted console that mirrors what the
 * OpenJarvis agent is doing in near-real-time: preset initialization,
 * OS-level command execution, and MCP tool invocations. Each entry is
 * tagged with its source so it can be color-coded.
 *
 * Tag conventions (matches the spec):
 *   [OpenJarvis Core]  — orchestration / preset lifecycle
 *   [OpenJarvis OS]    — shell / application control
 *   [OpenJarvis MCP]   — Model Context Protocol tool calls
 *   [Echo]             — UI-side events (connection, toggles, etc.)
 */

const TAG_CLASS = {
  '[OpenJarvis Core]': 'log-core',
  '[OpenJarvis OS]': 'log-os',
  '[OpenJarvis MCP]': 'log-mcp',
  '[Echo]': 'log-echo',
};

export class AgentConsole {
  constructor(root) {
    this.root = root;
    this.list = root.querySelector('[data-console="list"]');
    this.autoScroll = true;

    this.list.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = this.list;
      this.autoScroll = scrollHeight - (scrollTop + clientHeight) < 24;
    });
  }

  render(state) {
    const { logs } = state;
    const known = this.list.childElementCount;
    if (known === logs.length) return; // nothing new

    // Append only the new entries instead of re-rendering everything.
    for (let i = known; i < logs.length; i++) {
      this._appendEntry(logs[i]);
    }

    // Trim DOM nodes to match the trimmed log buffer.
    while (this.list.childElementCount > logs.length) {
      this.list.removeChild(this.list.firstChild);
    }

    if (this.autoScroll) {
      this.list.scrollTop = this.list.scrollHeight;
    }
  }

  _appendEntry(entry) {
    const line = document.createElement('div');
    line.className = 'console-line';

    const time = document.createElement('span');
    time.className = 'console-time';
    time.textContent = formatTime(entry.ts);

    const tag = document.createElement('span');
    const tagClass = TAG_CLASS[entry.tag] || 'log-echo';
    tag.className = `console-tag ${tagClass}`;
    tag.textContent = entry.tag;

    const msg = document.createElement('span');
    msg.className = 'console-msg';
    msg.textContent = entry.message;

    line.append(time, tag, msg);
    this.list.appendChild(line);
  }
}

function formatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
