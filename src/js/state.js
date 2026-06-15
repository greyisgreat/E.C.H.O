/**
 * Echo — State Store
 * -----------------------------------------------------------------------
 * A deliberately small pub/sub store. No framework, no build step — just
 * a plain object, a set of listeners, and a `set()` that shallow-merges
 * and notifies. Components subscribe to the slices they care about.
 */

import { STORAGE_KEYS, SAFETY_TOGGLES_DEFAULT } from './config.js';

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — degrade silently, in-memory only */
  }
}

const initialState = {
  connection: {
    status: 'connecting', // 'connecting' | 'online' | 'offline' | 'demo'
    baseUrl: localStorage.getItem(STORAGE_KEYS.baseUrl) || null,
    lastChecked: null,
    latencyMs: null,
  },
  system: {
    engine: '—',
    activeModel: '—',
    backend: '—',
    terminalPath: '—',
    memoryIndexSize: '—',
    contextWindow: '—',
    statusSource: 'unknown', // 'live' | 'estimated' | 'unknown'
  },
  orbState: 'idle', // 'idle' | 'thinking' | 'executing' | 'offline'
  toggles: loadJSON(STORAGE_KEYS.toggles, SAFETY_TOGGLES_DEFAULT),
  voice: {
    enabled: loadJSON(STORAGE_KEYS.voiceEnabled, true),
    voiceName: localStorage.getItem(STORAGE_KEYS.voiceName) || null,
  },
  logs: [],
  chat: loadJSON(STORAGE_KEYS.chatHistory, []),
};

const listeners = new Set();

export const store = {
  state: initialState,

  get(path) {
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), this.state);
  },

  set(partial) {
    this.state = deepMerge(this.state, partial);
    listeners.forEach((fn) => fn(this.state));
    persist(this.state);
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  pushLog(entry) {
    const logs = [...this.state.logs, { ...entry, ts: Date.now() }];
    // Keep the console buffer bounded so the DOM stays snappy.
    const trimmed = logs.length > 400 ? logs.slice(logs.length - 400) : logs;
    this.set({ logs: trimmed });
  },

  pushChatMessage(message) {
    const chat = [...this.state.chat, message];
    this.set({ chat });
  },
};

function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const sVal = source[key];
    const tVal = target[key];
    if (sVal && typeof sVal === 'object' && !Array.isArray(sVal) && tVal && typeof tVal === 'object' && !Array.isArray(tVal)) {
      output[key] = deepMerge(tVal, sVal);
    } else {
      output[key] = sVal;
    }
  }
  return output;
}

function persist(state) {
  saveJSON(STORAGE_KEYS.toggles, state.toggles);
  saveJSON(STORAGE_KEYS.voiceEnabled, state.voice.enabled);
  if (state.voice.voiceName) localStorage.setItem(STORAGE_KEYS.voiceName, state.voice.voiceName);
  if (state.connection.baseUrl) localStorage.setItem(STORAGE_KEYS.baseUrl, state.connection.baseUrl);
  // Chat history is capped to keep localStorage light.
  const trimmedChat = state.chat.length > 60 ? state.chat.slice(state.chat.length - 60) : state.chat;
  saveJSON(STORAGE_KEYS.chatHistory, trimmedChat);
}
