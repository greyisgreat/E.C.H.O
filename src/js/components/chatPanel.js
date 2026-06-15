/**
 * Echo — Chat Panel
 * -----------------------------------------------------------------------
 * Presentational layer for the conversation with OpenJarvis. Owns the
 * message list and the composer; defers all networking, tool-call
 * handling, and orb/console updates to main.js via callbacks. Also
 * renders the Quick Actions row (subject to the Safety Toggles state).
 */

import { QUICK_ACTIONS } from '../config.js';

export class ChatPanel {
  constructor(root, { onSend, onQuickAction } = {}) {
    this.root = root;
    this.onSend = onSend;
    this.onQuickAction = onQuickAction;

    this.messageList = root.querySelector('[data-chat="messages"]');
    this.form = root.querySelector('[data-chat="form"]');
    this.input = root.querySelector('[data-chat="input"]');
    this.quickActionsEl = root.querySelector('[data-chat="quick-actions"]');
    this.sendBtn = root.querySelector('[data-chat="send"]');

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (!text) return;
      this.input.value = '';
      this.onSend?.(text);
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.form.requestSubmit();
      }
    });

    this._renderQuickActions();
  }

  _renderQuickActions() {
    this.quickActionsEl.innerHTML = '';
    for (const action of QUICK_ACTIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-action';
      btn.dataset.action = action.id;
      btn.dataset.requires = action.requiresToggle;
      btn.textContent = action.label;
      btn.addEventListener('click', () => this.onQuickAction?.(action));
      this.quickActionsEl.appendChild(btn);
    }
  }

  renderToggleGating(toggles) {
    this.quickActionsEl.querySelectorAll('.quick-action').forEach((btn) => {
      const requires = btn.dataset.requires;
      const enabled = !requires || toggles[requires];
      btn.disabled = !enabled;
      btn.title = enabled ? '' : `Enable "${labelForToggle(requires)}" in the Safety panel to use this`;
    });
  }

  /** Renders the full chat history (used on load / history restore). */
  renderHistory(messages) {
    this.messageList.innerHTML = '';
    for (const msg of messages) this._appendMessage(msg.role, msg.content, { animate: false });
    this._scrollToBottom();
  }

  appendUserMessage(text) {
    this._appendMessage('user', text);
  }

  /**
   * Starts a streaming assistant message and returns handles to update
   * it incrementally.
   */
  beginAssistantMessage() {
    const el = this._appendMessage('assistant', '', { pending: true });
    const textEl = el.querySelector('.bubble-text');
    return {
      el,
      appendToken: (token) => {
        textEl.textContent += token;
        this._scrollToBottom();
      },
      setText: (text) => {
        textEl.textContent = text;
      },
      finish: () => {
        el.classList.remove('pending');
      },
    };
  }

  setBusy(busy) {
    this.sendBtn.disabled = busy;
    this.input.disabled = busy;
  }

  _appendMessage(role, content, { animate = true, pending = false } = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-bubble bubble-${role}${pending ? ' pending' : ''}${animate ? ' bubble-enter' : ''}`;

    const author = document.createElement('div');
    author.className = 'bubble-author';
    author.textContent = role === 'user' ? 'You' : 'OpenJarvis';

    const text = document.createElement('div');
    text.className = 'bubble-text';
    text.textContent = content;

    wrapper.append(author, text);
    this.messageList.appendChild(wrapper);
    this._scrollToBottom();
    return wrapper;
  }

  _scrollToBottom() {
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }
}

function labelForToggle(key) {
  const map = {
    fileEditing: 'File Editing',
    appTabControl: 'App & Tab Control',
    shellExecution: 'Shell Execution',
  };
  return map[key] || key;
}
