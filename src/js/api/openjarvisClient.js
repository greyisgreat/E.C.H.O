/**
 * Echo — OpenJarvis API Client
 * -----------------------------------------------------------------------
 * Thin wrapper around the local OpenJarvis server started with
 * `jarvis serve`, which exposes an OpenAI-compatible REST surface
 * (`/v1/models`, `/v1/chat/completions`, streamed via SSE).
 *
 * Design notes:
 *  - Every method fails soft. Network errors resolve to `{ ok: false }`
 *    shapes rather than throwing, so the UI can fall back to Demo Mode
 *    instead of dying.
 *  - `streamChatCompletion` parses the standard `data: {...}` SSE frames
 *    OpenAI-compatible servers emit, including the `choices[0].delta`
 *    fields for both `content` and `tool_calls`. Tool-call deltas are
 *    forwarded via `onToolCall` so the Agent Control Stream and the
 *    particle orb can react in real time.
 *  - `getSystemStatus` is best-effort: OpenJarvis's exact status route is
 *    not part of the stable OpenAI-compatible surface, so this probes a
 *    short list of candidate paths (see config.js → ENDPOINTS.statusCandidates)
 *    and otherwise derives a partial picture from `/v1/models`.
 */

import { ENDPOINTS } from '../config.js';

export class OpenJarvisClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setBaseUrl(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  url(path) {
    return `${this.baseUrl}${path}`;
  }

  /**
   * Lightweight reachability probe. Hits /models with a short timeout —
   * if OpenJarvis is up, this responds near-instantly even while a
   * generation is in-flight on another connection.
   */
  async checkHealth(timeoutMs = 2500) {
    const start = performance.now();
    try {
      const res = await this._fetchWithTimeout(this.url(ENDPOINTS.models), {}, timeoutMs);
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
      const data = await res.json().catch(() => null);
      return { ok: true, latencyMs, models: data };
    } catch (err) {
      return { ok: false, latencyMs: Math.round(performance.now() - start), error: err.message };
    }
  }

  async listModels() {
    try {
      const res = await this._fetchWithTimeout(this.url(ENDPOINTS.models), {}, 4000);
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      const ids = (data?.data ?? []).map((m) => m.id).filter(Boolean);
      return { ok: true, models: ids };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Best-effort system status. Tries each candidate route in
   * ENDPOINTS.statusCandidates; on success expects a loosely-shaped JSON
   * object and normalizes whatever fields it can find. If nothing
   * responds, derives a partial status from /v1/models so the HUD still
   * shows the active model rather than going fully blank.
   */
  async getSystemStatus() {
    for (const path of ENDPOINTS.statusCandidates) {
      try {
        const res = await this._fetchWithTimeout(this.url(path.replace(/^\/v1/, '')), {}, 2000);
        if (res.ok) {
          const data = await res.json();
          return { ok: true, source: 'live', data: normalizeStatus(data) };
        }
      } catch {
        /* try next candidate */
      }
    }

    const models = await this.listModels();
    if (models.ok) {
      return {
        ok: true,
        source: 'estimated',
        data: normalizeStatus({
          active_model: models.models[0] ?? '—',
          engine: 'unknown (no status route exposed)',
          memory_index_size: '—',
          terminal_path: 'local shell (via jarvis agent)',
        }),
      };
    }

    return { ok: false, source: 'unknown', data: null };
  }

  /**
   * Streams a chat completion. `onToken` receives incremental text,
   * `onToolCall` receives normalized { name, argsFragment } deltas, and
   * `onDone` fires once with the full accumulated text + tool calls.
   */
  async streamChatCompletion({ model, messages, onToken, onToolCall, onDone, onError, signal }) {
    let fullText = '';
    const toolCalls = [];

    try {
      const res = await fetch(this.url(ENDPOINTS.chatCompletions), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'default',
          messages,
          stream: true,
          temperature: 0.7,
        }),
        signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep the trailing partial line in the buffer

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;

          let json;
          try {
            json = JSON.parse(payload);
          } catch {
            continue; // ignore malformed frames rather than killing the stream
          }

          const delta = json?.choices?.[0]?.delta;
          if (!delta) continue;

          if (typeof delta.content === 'string' && delta.content.length) {
            fullText += delta.content;
            onToken?.(delta.content);
          }

          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const name = tc.function?.name;
              const argsFragment = tc.function?.arguments ?? '';
              if (name || argsFragment) {
                toolCalls.push({ name, argsFragment });
                onToolCall?.({ name, argsFragment });
              }
            }
          }
        }
      }

      onDone?.({ text: fullText, toolCalls });
      return { ok: true, text: fullText, toolCalls };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { ok: false, aborted: true };
      }
      onError?.(err);
      return { ok: false, error: err.message };
    }
  }

  async _fetchWithTimeout(resource, options = {}, timeoutMs = 4000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(resource, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

function normalizeStatus(data) {
  return {
    engine: data.engine ?? data.runtime ?? data.backend ?? '—',
    activeModel: data.active_model ?? data.model ?? data.current_model ?? '—',
    backend: data.backend ?? data.engine ?? '—',
    terminalPath: data.terminal_path ?? data.shell ?? data.execution_path ?? '—',
    memoryIndexSize: data.memory_index_size ?? data.memory_items ?? data.index_size ?? '—',
    contextWindow: data.context_window ?? data.context_length ?? '—',
  };
}
