/**
 * Echo — Voice Engine
 * -----------------------------------------------------------------------
 * Wraps the Web Speech API's SpeechSynthesis to read OpenJarvis's
 * responses aloud with a deep, articulate male voice and a more natural
 * cadence than the raw API provides by default.
 *
 * Cadence strategy:
 *  - The response is split into sentences (and, for long sentences,
 *    clauses on commas/semicolons).
 *  - Each chunk is spoken as its own SpeechSynthesisUtterance with a
 *    slightly-below-1.0 rate and pitch, which reads as calmer and more
 *    "human operator" than the default robotic monotone.
 *  - A short, silent gap is inserted between chunks (sentencePauseMs /
 *    clausePauseMs) to mimic natural breathing pauses — most platform
 *    TTS engines otherwise run sentences together with no breath at all.
 *  - Pitch and rate get a tiny per-chunk jitter so the result doesn't
 *    sound metronomic.
 */

import { VOICE } from '../config.js';

export class VoiceEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.queue = [];
    this.speaking = false;
    this._voicesReady = this._loadVoices();
  }

  get supported() {
    return Boolean(this.synth);
  }

  _loadVoices() {
    if (!this.synth) return Promise.resolve([]);
    return new Promise((resolve) => {
      const existing = this.synth.getVoices();
      if (existing.length) {
        this._pickVoice(existing);
        resolve(existing);
        return;
      }
      this.synth.addEventListener('voiceschanged', () => {
        const voices = this.synth.getVoices();
        this._pickVoice(voices);
        resolve(voices);
      }, { once: true });
    });
  }

  _pickVoice(voices, preferredName) {
    if (preferredName) {
      const exact = voices.find((v) => v.name === preferredName);
      if (exact) {
        this.voice = exact;
        return;
      }
    }
    for (const name of VOICE.preferredNames) {
      const match = voices.find((v) => v.name === name);
      if (match) {
        this.voice = match;
        return;
      }
    }
    // Fall back to any voice whose name suggests a male timbre.
    const heuristic = voices.find((v) => /male|david|daniel|alex|fred|guy|tom/i.test(v.name) && !/female/i.test(v.name));
    this.voice = heuristic || voices.find((v) => v.lang?.startsWith('en')) || voices[0] || null;
  }

  async listVoices() {
    await this._voicesReady;
    return this.synth ? this.synth.getVoices() : [];
  }

  async setVoiceByName(name) {
    const voices = await this.listVoices();
    this._pickVoice(voices, name);
  }

  /**
   * Speaks `text`, breaking it into sentence/clause chunks with pauses.
   * Returns a promise that resolves once playback finishes (or is
   * cancelled).
   */
  async speak(text) {
    if (!this.synth || !text?.trim()) return;
    await this._voicesReady;

    this.cancel();
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      await this._speakChunk(chunk.text);
      await wait(chunk.endOfSentence ? VOICE.sentencePauseMs : VOICE.clausePauseMs);
    }
  }

  _speakChunk(text) {
    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      if (this.voice) utter.voice = this.voice;
      const jitter = (Math.random() - 0.5) * 0.04;
      utter.rate = VOICE.rate + jitter;
      utter.pitch = VOICE.pitch + jitter;
      utter.volume = VOICE.volume;
      utter.onend = resolve;
      utter.onerror = resolve;
      this.synth.speak(utter);
    });
  }

  cancel() {
    this.synth?.cancel();
  }
}

function chunkText(text) {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[^.!?]+[.!?]*/g) || [text];

  const chunks = [];
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length > 140) {
      const clauses = trimmed.split(/(?<=[,;:])\s+/);
      clauses.forEach((c, i) => {
        chunks.push({ text: c, endOfSentence: i === clauses.length - 1 });
      });
    } else {
      chunks.push({ text: trimmed, endOfSentence: true });
    }
  }
  return chunks;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
