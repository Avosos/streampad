import { MidiEngine } from '../midi/MidiEngine';
import { ProfileManager } from '../profiles/ProfileManager';
import { LedState, PadColor, PadConfig } from '../../shared/types';
import { DEVICE_DESCRIPTORS, detectModel } from '../../shared/devices';

/**
 * LedController – manages the visual state of all Launchpad LEDs.
 * Syncs pad colors with their configured states, handles animations,
 * and provides an API for dynamic visual effects.
 */
export class LedController {
  private midiEngine: MidiEngine;
  private profileManager: ProfileManager;
  private animationTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private currentColors: Map<string, PadColor> = new Map();

  constructor(midiEngine: MidiEngine, profileManager: ProfileManager) {
    this.midiEngine = midiEngine;
    this.profileManager = profileManager;
  }

  /**
   * Refresh all LEDs for a device based on the active profile/layer.
   */
  refreshAll(deviceId: string): void {
    const layer = this.profileManager.getActiveLayer();
    if (!layer) return;

    for (const pad of layer.pads) {
      this.setPadLed(deviceId, pad, pad.ledDefault);
    }
  }

  /**
   * Set a pad's LED to a specific state.
   */
  setPadLed(deviceId: string, pad: PadConfig, ledState: LedState): void {
    const key = `${deviceId}:${pad.midiNote}`;

    // Stop any running animation on this pad
    this.stopAnimation(key);

    const color = this.applyBrightness(ledState.color, ledState.brightness);
    this.currentColors.set(key, color);
    this.midiEngine.setLed(deviceId, pad.midiNote, color);

    // Start animation if configured
    if (ledState.animation && ledState.animation !== 'none') {
      this.startAnimation(key, deviceId, pad.midiNote, ledState);
    }
  }

  /**
   * Flash a pad (e.g., on press) then return to default.
   */
  flashPad(deviceId: string, pad: PadConfig, durationMs = 150): void {
    this.setPadLed(deviceId, pad, pad.ledActive);
    setTimeout(() => {
      this.setPadLed(deviceId, pad, pad.ledDefault);
    }, durationMs);
  }

  /**
   * Set a pad to active state (e.g., toggle on).
   */
  setActive(deviceId: string, pad: PadConfig): void {
    this.setPadLed(deviceId, pad, pad.ledActive);
  }

  /**
   * Set a pad to inactive/default state.
   */
  setInactive(deviceId: string, pad: PadConfig): void {
    this.setPadLed(deviceId, pad, pad.ledInactive || pad.ledDefault);
  }

  /**
   * Set a single LED by note number directly.
   */
  setLedDirect(deviceId: string, note: number, color: PadColor): void {
    const key = `${deviceId}:${note}`;
    this.currentColors.set(key, color);
    this.midiEngine.setLed(deviceId, note, color);
  }

  /**
   * Clear all LEDs on a device.
   */
  clearAll(deviceId: string): void {
    // Stop all animations
    for (const [key, timer] of this.animationTimers) {
      if (key.startsWith(deviceId)) {
        clearInterval(timer);
        this.animationTimers.delete(key);
      }
    }
    this.midiEngine.clearAllLeds(deviceId);
  }

  private startAnimation(
    key: string,
    deviceId: string,
    note: number,
    ledState: LedState
  ): void {
    const speed = ledState.animationSpeed || 500;

    switch (ledState.animation) {
      case 'pulse': {
        let phase = 0;
        const timer = setInterval(() => {
          phase += 0.1;
          const factor = (Math.sin(phase) + 1) / 2;
          const color = this.applyBrightness(ledState.color, ledState.brightness * factor);
          this.midiEngine.setLed(deviceId, note, color);
        }, speed / 10);
        this.animationTimers.set(key, timer);
        break;
      }

      case 'flash': {
        let on = true;
        const timer = setInterval(() => {
          if (on) {
            this.midiEngine.setLed(deviceId, note, this.applyBrightness(ledState.color, ledState.brightness));
          } else {
            this.midiEngine.setLed(deviceId, note, { r: 0, g: 0, b: 0 });
          }
          on = !on;
        }, speed);
        this.animationTimers.set(key, timer);
        break;
      }

      case 'rainbow': {
        let hue = 0;
        const timer = setInterval(() => {
          hue = (hue + 5) % 360;
          const color = this.hslToRgb(hue, 1.0, ledState.brightness * 0.5);
          this.midiEngine.setLed(deviceId, note, color);
        }, speed / 20);
        this.animationTimers.set(key, timer);
        break;
      }
    }
  }

  private stopAnimation(key: string): void {
    const timer = this.animationTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.animationTimers.delete(key);
    }
  }

  private applyBrightness(color: PadColor, brightness: number): PadColor {
    return {
      r: Math.round(color.r * Math.max(0, Math.min(1, brightness))),
      g: Math.round(color.g * Math.max(0, Math.min(1, brightness))),
      b: Math.round(color.b * Math.max(0, Math.min(1, brightness))),
    };
  }

  private hslToRgb(h: number, s: number, l: number): PadColor {
    h /= 360;
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  shutdown(): void {
    for (const [, timer] of this.animationTimers) {
      clearInterval(timer);
    }
    this.animationTimers.clear();
    this.currentColors.clear();
  }
}
