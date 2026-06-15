/**
 * Echo — Configuration
 * -----------------------------------------------------------------------
 * Central, single-source configuration for the Echo dashboard. Everything
 * that points at the local OpenJarvis instance, every storage key, and
 * every tunable constant for the orb / voice / console lives here so the
 * rest of the app never hard-codes magic values.
 *
 * OpenJarvis ships an OpenAI-compatible server via `jarvis serve`, which
 * is why the defaults below target the standard `/v1` surface
 * (`/v1/chat/completions`, `/v1/models`). The non-standard "system status"
 * endpoints are best-effort guesses — adjust ENDPOINTS.status to match
 * whatever your OpenJarvis build exposes (see README → "Wiring Echo to
 * your OpenJarvis instance").
 */

export const STORAGE_KEYS = {
  baseUrl: 'echo.openjarvis.baseUrl',
  toggles: 'echo.safety.toggles',
  voiceEnabled: 'echo.voice.enabled',
  voiceName: 'echo.voice.name',
  chatHistory: 'echo.chat.history',
  theme: 'echo.theme',
};

export const DEFAULT_BASE_URLS = [
  'http://localhost:8000/v1',
  'http://localhost:8080/v1',
];

export const ENDPOINTS = {
  // Standard OpenAI-compatible surface exposed by `jarvis serve`.
  models: '/models',
  chatCompletions: '/chat/completions',

  // Best-effort / non-standard. Echo will probe these and fall back to a
  // derived "estimate" badge if none respond. Override in Settings if your
  // OpenJarvis build exposes a different path (often configured via
  // `jarvis serve --status-route` or a custom FastAPI router).
  statusCandidates: [
    '/system/status',
    '/status',
    '/jarvis/status',
  ],
};

export const ORB = {
  particleCount: 2600,
  helixTurns: 5.5,
  helixRadius: 96,
  tubeRadius: 26,
  baseRotationSpeed: 0.0009, // radians / ms while idle
  thinkRotationSpeed: 0.0026,
  execRotationSpeed: 0.0048,
  perspective: 620,
  cameraDistance: 420,
  particleSize: { min: 0.6, max: 2.6 },
  colors: {
    idle: { a: '#7c3aed', b: '#3b82f6', glow: 'rgba(124, 58, 237, 0.35)' },
    thinking: { a: '#a855f7', b: '#22d3ee', glow: 'rgba(168, 85, 247, 0.45)' },
    executing: { a: '#f472b6', b: '#60a5fa', glow: 'rgba(96, 165, 250, 0.55)' },
    offline: { a: '#475569', b: '#334155', glow: 'rgba(71, 85, 105, 0.25)' },
  },
};

export const POLL_INTERVALS = {
  healthMs: 8000,
  statusMs: 6000,
  clockMs: 1000,
};

export const SAFETY_TOGGLES_DEFAULT = {
  fileEditing: false,
  appTabControl: false,
  shellExecution: false,
};

export const QUICK_ACTIONS = [
  {
    id: 'open-safari',
    label: 'Open Safari',
    requiresToggle: 'appTabControl',
    prompt: 'Open Safari on this machine.',
    streamTag: '[OpenJarvis OS]',
  },
  {
    id: 'list-downloads',
    label: 'List ~/Downloads',
    requiresToggle: 'fileEditing',
    prompt: 'List the contents of my Downloads folder.',
    streamTag: '[OpenJarvis MCP]',
  },
  {
    id: 'system-snapshot',
    label: 'System Snapshot',
    requiresToggle: 'shellExecution',
    prompt: 'Run a quick system resource snapshot (CPU, memory, disk) and summarize it.',
    streamTag: '[OpenJarvis OS]',
  },
  {
    id: 'codebase-map',
    label: 'Map Current Project',
    requiresToggle: 'fileEditing',
    prompt: 'Analyze the current working directory and produce a high-level architecture diagram of it.',
    streamTag: '[OpenJarvis MCP]',
  },
];

export const VOICE = {
  preferredNames: [
    'Daniel',
    'Google UK English Male',
    'Microsoft Guy Online (Natural) - English (United States)',
    'Microsoft David - English (United States)',
    'Alex',
    'Fred',
  ],
  rate: 0.98,
  pitch: 0.92,
  volume: 1,
  // Inserted between sentences to relax the cadence and avoid the
  // "machine-gun" monotone read-through common to default TTS.
  sentencePauseMs: 140,
  clausePauseMs: 70,
};

export const SYSTEM_PROMPT_TEMPLATE = (toggles) => {
  const granted = [];
  const denied = [];
  if (toggles.fileEditing) granted.push('file read/write'); else denied.push('file read/write');
  if (toggles.appTabControl) granted.push('application & tab control'); else denied.push('application & tab control');
  if (toggles.shellExecution) granted.push('shell command execution'); else denied.push('shell command execution');

  return [
    'You are OpenJarvis, a local-first personal AI agent operating through the Echo dashboard.',
    granted.length
      ? `The operator has GRANTED the following capability scopes for this session: ${granted.join(', ')}.`
      : 'The operator has not granted any elevated capability scopes for this session.',
    denied.length
      ? `The following capability scopes are currently DENIED by the operator: ${denied.join(', ')}. Do not attempt tools in these categories; explain that the toggle must be enabled in Echo's Safety panel first.`
      : '',
    'When you take an action, narrate it briefly so it can be mirrored into the Agent Control Stream.',
  ].filter(Boolean).join('\n');
};
