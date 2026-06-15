/**
 * Echo (Electronic Cognitive Holographic Origin)
 * -----------------------------------------------------------------------
 * Main Application Orchestrator
 */

import { store } from './state.js';
import { CONFIG } from './config.js';
import { OpenJarvisClient } from './api/openjarvisClient.js';
import { ParticleOrb } from './orb/particleOrb.js';

// Import UI components
import { StatusHud } from './components/statusHud.js';
import { AgentConsole } from './components/agentConsole.js';
import { SafetyToggles } from './components/safetyToggles.js';
import { Chronometer } from './components/chronometer.js';
import { MapsFrame } from './components/mapsFrame.js';
import { DiagramCanvas } from './components/diagramCanvas.js';
import { ChatPanel } from './components/chatPanel.js';
import { VoiceEngine } from './components/voiceEngine.js';

class EchoCore {
  constructor() {
    this.client = null;
    this.components = {};
    this.pollInterval = null;
  }

  async init() {
    console.log('Initializing Echo Core Systems...');

    // Initialize API Client connection to OpenJarvis backend
    this.client = new OpenJarvisClient(CONFIG.api.baseUrl);

    // Initialize the Canvas particle engine
    const orbCanvas = document.getElementById('orb-canvas');
    if (orbCanvas) {
      this.components.orb = new ParticleOrb(orbCanvas);
      this.components.orb.start();
    }

    // Bind UI components to their DOM nodes
    this.components.statusHud = new StatusHud(document.querySelector('.hud-panel'));
    this.components.agentConsole = new AgentConsole(document.querySelector('.console-panel'));
    this.components.safetyToggles = new SafetyToggles(document.querySelector('.toggles-panel'));
    this.components.chronometer = new Chronometer(document.querySelector('.chrono-panel'));
    this.components.mapsFrame = new MapsFrame(document.querySelector('.map-panel'));
    this.components.diagramCanvas = new DiagramCanvas(document.querySelector('.diagram-panel'));
    this.components.voiceEngine = new VoiceEngine();

    this.components.chatPanel = new ChatPanel(
      document.querySelector('.chat-panel'), 
      (msg) => this.handleUserMessage(msg)
    );

    // Subscribe elements to the reactive global state store
    store.subscribe((state) => this.syncState(state));

    // Run the initial startup logs sequence
    this.bootSequence();
    
    // Monitor connection health to local server
    this.checkBackendConnection();
    this.pollInterval = setInterval(() => this.checkBackendConnection(), CONFIG.api.pollIntervalMs);
  }

  bootSequence() {
    const systemLogs = [
      'CRITICAL: Initializing E.C.H.O. secure matrix framework...',
      'SYSTEM: Validating local environment architecture...',
      'SYSTEM: Mapping reactive interface state engines...',
      'SUCCESS: Visual communication dashboard layer fully active.'
    ];

    systemLogs.forEach((log, index) => {
      setTimeout(() => {
        store.dispatch('ADD_CONSOLE_LOG', { text: log, type: 'system' });
      }, index * 250);
    });
  }

  async checkBackendConnection() {
    try {
      const isHealthy = await this.client.checkHealth();
      if (isHealthy) {
        if (store.getState().connection.status !== 'online') {
          store.dispatch('SET_CONNECTION_STATUS', { status: 'online', error: null });
          store.dispatch('ADD_CONSOLE_LOG', { text: 'API: Connected securely to local OpenJarvis instance.', type: 'success' });
          this.fetchTelemetryData();
        }
      } else {
        this.activateDemoMode();
      }
    } catch (err) {
      this.activateDemoMode();
    }
  }

  activateDemoMode() {
    const currentState = store.getState().connection.status;
    if (currentState !== 'demo') {
      store.dispatch('SET_CONNECTION_STATUS', { status: 'demo', error: 'Local backend unreachable' });
      store.dispatch('ADD_CONSOLE_LOG', { 
        text: 'API: OpenJarvis backend offline. Activating secure local system simulation.', 
        type: 'warning' 
      });
    }
  }

  async fetchTelemetryData() {
    try {
      const info = await this.client.getSystemInfo();
      store.dispatch('UPDATE_SYSTEM_TELEMETRY', info);
    } catch (err) {
      console.warn('Failed to parse active system logs.');
    }
  }

  async handleUserMessage(messageText) {
    if (!messageText.trim()) return;

    store.dispatch('ADD_CHAT_MESSAGE', { role: 'user', text: messageText });
    store.dispatch('SET_ORB_STATE', { mode: 'thinking' });

    const state = store.getState();

    if (state.connection.status === 'demo') {
      this.simulateDemoResponse(messageText);
    } else {
      try {
        store.dispatch('ADD_CONSOLE_LOG', { text: `AGENT: Processing natural language instruction sequence...`, type: 'info' });
        
        let fullResponse = '';
        await this.client.streamChat(messageText, state.toggles, (chunk) => {
          fullResponse += chunk;
          store.dispatch('UPDATE_PENDING_RESPONSE', { text: fullResponse });
        });

        store.dispatch('COMMIT_PENDING_RESPONSE');
        store.dispatch('SET_ORB_STATE', { mode: 'idle' });
        this.components.voiceEngine.speak(fullResponse);
      } catch (err) {
        store.dispatch('ADD_CONSOLE_LOG', { text: `ERROR: Failed downstream API transmission execution: ${err.message}`, type: 'error' });
        store.dispatch('SET_ORB_STATE', { mode: 'idle' });
      }
    }
  }

  simulateDemoResponse(prompt) {
    setTimeout(() => {
      store.dispatch('SET_ORB_STATE', { mode: 'executing' });
      store.dispatch('ADD_CONSOLE_LOG', { text: 'DEMO: Executing simulated tool routing loop...', type: 'info' });
      
      let mockReply = "Dashboard running in simulation mode. Connect to your local OpenJarvis framework engine to unlock full core operations.";
      
      if (prompt.toLowerCase().includes('clear')) {
        mockReply = "Interface workspace console structures cleaned and re-aligned.";
      }

      store.dispatch('ADD_CHAT_MESSAGE', { role: 'assistant', text: mockReply });
      store.dispatch('SET_ORB_STATE', { mode: 'idle' });
      this.components.voiceEngine.speak(mockReply);
    }, 1200);
  }

  syncState(state) {
    // Sync vanilla component files cleanly on global data updates
    if (this.components.statusHud) this.components.statusHud.render(state);
    if (this.components.agentConsole) this.components.agentConsole.render(state.console);
    if (this.components.safetyToggles) this.components.safetyToggles.render(state.toggles);
    if (this.components.chatPanel) this.components.chatPanel.render(state.chat);
    
    // Pass execution states cleanly to the canvas particle engine
    if (this.components.orb) {
      this.components.orb.setMode(state.orb.mode);
    }
  }
}

// Global initialization hook
window.addEventListener('DOMContentLoaded', () => {
  const app = new EchoCore();
  app.init().catch(err => console.error('Echo Engine Failure:', err));
});