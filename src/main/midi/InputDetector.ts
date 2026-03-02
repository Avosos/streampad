import { EventEmitter } from 'events';
import { MidiMessage, InputEvent } from '../../shared/types';

interface PadState {
  isPressed: boolean;
  pressTimestamp: number;
  releaseTimestamp: number;
  pressCount: number;
  holdTimer: ReturnType<typeof setTimeout> | null;
  multiPressTimer: ReturnType<typeof setTimeout> | null;
  lastVelocity: number;
  lastPressure: number;
}

/**
 * Input Detector – translates raw MIDI messages into high-level
 * input events: press, release, hold, double_press, triple_press,
 * velocity, aftertouch.
 */
export class InputDetector extends EventEmitter {
  private padStates: Map<string, PadState> = new Map();
  private holdThresholdMs = 400;
  private multiPressWindowMs = 350;

  private getKey(deviceId: string, note: number): string {
    return `${deviceId}:${note}`;
  }

  private getOrCreateState(key: string): PadState {
    let state = this.padStates.get(key);
    if (!state) {
      state = {
        isPressed: false,
        pressTimestamp: 0,
        releaseTimestamp: 0,
        pressCount: 0,
        holdTimer: null,
        multiPressTimer: null,
        lastVelocity: 0,
        lastPressure: 0,
      };
      this.padStates.set(key, state);
    }
    return state;
  }

  /**
   * Process an incoming MIDI message and emit high-level events.
   */
  processMessage(deviceId: string, msg: MidiMessage): void {
    const key = this.getKey(deviceId, msg.note);
    const state = this.getOrCreateState(key);

    switch (msg.type) {
      case 'noteon':
        this.handleNoteOn(deviceId, msg, state, key);
        break;
      case 'noteoff':
        this.handleNoteOff(deviceId, msg, state, key);
        break;
      case 'polyat':
      case 'aftertouch':
        this.handleAftertouch(deviceId, msg, state);
        break;
      case 'cc':
        // CC messages treated like note on/off for control buttons
        if (msg.velocity > 0) {
          this.handleNoteOn(deviceId, msg, state, key);
        } else {
          this.handleNoteOff(deviceId, msg, state, key);
        }
        break;
    }
  }

  private handleNoteOn(deviceId: string, msg: MidiMessage, state: PadState, key: string): void {
    state.isPressed = true;
    state.pressTimestamp = msg.timestamp;
    state.lastVelocity = msg.velocity;
    state.pressCount++;

    // Clear any existing multi-press timer
    if (state.multiPressTimer) {
      clearTimeout(state.multiPressTimer);
      state.multiPressTimer = null;
    }

    // Emit immediate press event
    this.emitInput(deviceId, msg.note, 'press', msg.velocity);

    // Emit velocity event if significant
    if (msg.velocity > 0) {
      this.emitInput(deviceId, msg.note, 'velocity', msg.velocity);
    }

    // Start hold detection
    if (state.holdTimer) clearTimeout(state.holdTimer);
    state.holdTimer = setTimeout(() => {
      if (state.isPressed) {
        this.emitInput(deviceId, msg.note, 'hold', state.lastVelocity);
      }
    }, this.holdThresholdMs);
  }

  private handleNoteOff(deviceId: string, msg: MidiMessage, state: PadState, key: string): void {
    state.isPressed = false;
    state.releaseTimestamp = msg.timestamp;

    // Cancel hold timer
    if (state.holdTimer) {
      clearTimeout(state.holdTimer);
      state.holdTimer = null;
    }

    // Emit release
    this.emitInput(deviceId, msg.note, 'release', 0);

    // Multi-press detection
    const pressCount = state.pressCount;
    state.multiPressTimer = setTimeout(() => {
      if (pressCount >= 3) {
        this.emitInput(deviceId, msg.note, 'triple_press', state.lastVelocity);
      } else if (pressCount >= 2) {
        this.emitInput(deviceId, msg.note, 'double_press', state.lastVelocity);
      }
      state.pressCount = 0;
    }, this.multiPressWindowMs);
  }

  private handleAftertouch(deviceId: string, msg: MidiMessage, state: PadState): void {
    state.lastPressure = msg.velocity;
    this.emitInput(deviceId, msg.note, 'aftertouch', msg.velocity);
  }

  private emitInput(deviceId: string, note: number, event: InputEvent, value: number): void {
    this.emit('input', { deviceId, note, event, value, timestamp: Date.now() });
  }

  setHoldThreshold(ms: number): void {
    this.holdThresholdMs = ms;
  }

  setMultiPressWindow(ms: number): void {
    this.multiPressWindowMs = ms;
  }

  reset(): void {
    for (const state of this.padStates.values()) {
      if (state.holdTimer) clearTimeout(state.holdTimer);
      if (state.multiPressTimer) clearTimeout(state.multiPressTimer);
    }
    this.padStates.clear();
  }
}
