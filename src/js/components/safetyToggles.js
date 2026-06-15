/**
 * Echo — System Execution Safety Toggles
 * -----------------------------------------------------------------------
 * Three switches that gate which capability categories Echo will offer
 * to the OpenJarvis agent for this session:
 *
 *   - File Editing       -> file read/write tools
 *   - Tab / App Control  -> opening apps, switching tabs, window mgmt
 *   - Shell Execution     -> arbitrary shell command execution
 *
 * Important: Echo is a UI layer, not a sandbox. These toggles control
 * (a) which quick actions are enabled in this UI, and (b) a capability
 * hint sent to OpenJarvis as part of the system prompt (see
 * config.js -> SYSTEM_PROMPT_TEMPLATE). Real enforcement of these
 * boundaries must be configured on the OpenJarvis side (its own tool
 * allow-list / spec). Treat these switches as a steering signal, not a
 * security boundary.
 */

export class SafetyToggles {
  constructor(root, { onChange } = {}) {
    this.root = root;
    this.onChange = onChange;
    this.switches = Array.from(root.querySelectorAll('[data-toggle]'));

    this.switches.forEach((el) => {
      el.addEventListener('click', () => {
        const key = el.dataset.toggle;
        const next = el.getAttribute('aria-checked') !== 'true';
        el.setAttribute('aria-checked', String(next));
        this.onChange?.(key, next);
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  render(state) {
    const { toggles } = state;
    this.switches.forEach((el) => {
      const key = el.dataset.toggle;
      const value = Boolean(toggles[key]);
      el.setAttribute('aria-checked', String(value));
    });
  }
}
