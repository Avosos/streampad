import { EventEmitter } from 'events';
import JZZ from 'jzz';
import { MidiDeviceInfo, MidiMessage, PadColor, LaunchpadModel } from '../../shared/types';
import { DEVICE_DESCRIPTORS, detectModel } from '../../shared/devices';
import { v4 as uuid } from 'uuid';

export interface MidiPort {
  id: string;
  name: string;
  jzzPort: any;
}

/**
 * Core MIDI Engine – handles all MIDI I/O, device detection,
 * message parsing, and LED output.
 */
export class MidiEngine extends EventEmitter {
  private inputs: Map<string, MidiPort> = new Map();
  private outputs: Map<string, MidiPort> = new Map();
  private devices: Map<string, MidiDeviceInfo> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private _jzz: any = null;

  async initialize(): Promise<void> {
    try {
      this._jzz = await JZZ();
      console.log('[MidiEngine] JZZ initialized:', this._jzz.info().name);
      await this.scanDevices();
      this.startPolling();
    } catch (err) {
      console.error('[MidiEngine] Failed to initialize JZZ:', err);
    }
  }

  /**
   * Check if a MIDI port name belongs to a Launchpad.
   */
  private isLaunchpadPort(name: string): boolean {
    const lower = name.toLowerCase();
    return lower.includes('launchpad');
  }

  /**
   * Scan for connected MIDI devices and open Launchpad ports.
   * Non-Launchpad outputs (e.g. Microsoft GS Wavetable Synth) are ignored.
   */
  async scanDevices(): Promise<MidiDeviceInfo[]> {
    if (!this._jzz) return [];

    const info = this._jzz.info();
    const currentDeviceNames = new Set<string>();

    // Process inputs – only open Launchpad inputs
    for (const inp of info.inputs) {
      const name: string = inp.name;
      if (!this.isLaunchpadPort(name)) continue;

      currentDeviceNames.add(name);

      if (!this.findDeviceByName(name)) {
        const deviceId = uuid();
        const device: MidiDeviceInfo = {
          id: deviceId,
          name: name,
          manufacturer: inp.manufacturer || 'Unknown',
          isInput: true,
          isOutput: false,
          isConnected: true,
        };
        this.devices.set(deviceId, device);
        await this.openInput(deviceId, name);
        this.emit('device:connected', device);
      }
    }

    // Process outputs – only open Launchpad outputs
    for (const out of info.outputs) {
      const name: string = out.name;
      if (!this.isLaunchpadPort(name)) continue;

      currentDeviceNames.add(name);

      const existing = this.findDeviceByName(name);
      if (existing) {
        if (!existing.isOutput) {
          existing.isOutput = true;
          await this.openOutput(existing.id, name);
        }
      } else {
        const deviceId = uuid();
        const device: MidiDeviceInfo = {
          id: deviceId,
          name: name,
          manufacturer: out.manufacturer || 'Unknown',
          isInput: false,
          isOutput: true,
          isConnected: true,
        };
        this.devices.set(deviceId, device);
        await this.openOutput(deviceId, name);
        this.emit('device:connected', device);
      }
    }

    // Detect disconnected devices
    for (const [id, device] of this.devices) {
      if (!currentDeviceNames.has(device.name) && device.isConnected) {
        device.isConnected = false;
        this.closePort(id);
        this.emit('device:disconnected', device);
      }
    }

    return Array.from(this.devices.values());
  }

  private findDeviceByName(name: string): MidiDeviceInfo | undefined {
    for (const device of this.devices.values()) {
      if (device.name === name) return device;
    }
    return undefined;
  }

  /**
   * Open a MIDI input port and start listening.
   */
  private async openInput(deviceId: string, portName: string): Promise<void> {
    try {
      const port = await JZZ().openMidiIn(portName);
      port.connect((msg: any) => {
        this.handleMidiInput(deviceId, msg);
      });
      this.inputs.set(deviceId, { id: deviceId, name: portName, jzzPort: port });
      console.log(`[MidiEngine] Opened input: ${portName}`);
    } catch (err) {
      console.error(`[MidiEngine] Failed to open input ${portName}:`, err);
    }
  }

  /**
   * Open a MIDI output port for LED feedback.
   */
  private async openOutput(deviceId: string, portName: string): Promise<void> {
    try {
      const port = await JZZ().openMidiOut(portName);
      this.outputs.set(deviceId, { id: deviceId, name: portName, jzzPort: port });
      console.log(`[MidiEngine] Opened output: ${portName}`);
    } catch (err) {
      console.error(`[MidiEngine] Failed to open output ${portName}:`, err);
    }
  }

  /**
   * Close ports for a device.
   */
  private closePort(deviceId: string): void {
    const input = this.inputs.get(deviceId);
    if (input) {
      try { input.jzzPort.close(); } catch { /* ignore */ }
      this.inputs.delete(deviceId);
    }
    const output = this.outputs.get(deviceId);
    if (output) {
      try { output.jzzPort.close(); } catch { /* ignore */ }
      this.outputs.delete(deviceId);
    }
  }

  /**
   * Parse raw MIDI message and emit typed events.
   */
  private handleMidiInput(deviceId: string, msg: any): void {
    const data = Array.from(msg) as number[];
    if (data.length < 2) return;

    const status = data[0];
    const type = status & 0xf0;
    const channel = status & 0x0f;

    let message: MidiMessage | null = null;

    switch (type) {
      case 0x90: // Note On
        message = {
          type: data[2] > 0 ? 'noteon' : 'noteoff',
          channel,
          note: data[1],
          velocity: data[2],
          timestamp: Date.now(),
        };
        break;
      case 0x80: // Note Off
        message = {
          type: 'noteoff',
          channel,
          note: data[1],
          velocity: data[2],
          timestamp: Date.now(),
        };
        break;
      case 0xb0: // Control Change
        message = {
          type: 'cc',
          channel,
          note: data[1], // CC number
          velocity: data[2], // CC value
          timestamp: Date.now(),
        };
        break;
      case 0xa0: // Polyphonic Aftertouch
        message = {
          type: 'polyat',
          channel,
          note: data[1],
          velocity: data[2],
          timestamp: Date.now(),
        };
        break;
      case 0xd0: // Channel Aftertouch
        message = {
          type: 'aftertouch',
          channel,
          note: 0,
          velocity: data[1],
          timestamp: Date.now(),
        };
        break;
    }

    if (message) {
      this.emit('midi:message', deviceId, message);
    }
  }

  /**
   * Set a single pad LED color via MIDI Note On (velocity = color index)
   * or SysEx for RGB.
   */
  setLed(deviceId: string, note: number, color: PadColor, useSysex = true): void {
    const output = this.outputs.get(deviceId);
    if (!output) return;

    const device = this.devices.get(deviceId);
    if (!device) return;

    const model = detectModel(device.name);
    const descriptor = DEVICE_DESCRIPTORS[model];

    if (useSysex && descriptor.sysexHeader.length > 0) {
      // SysEx RGB LED message: F0 00 20 29 02 10 0B <note> <r> <g> <b> F7
      const sysex = [
        0xf0,
        ...descriptor.sysexHeader,
        0x0b, // RGB LED command for Pro MK2
        note,
        Math.round(color.r / 2), // scale 0-255 → 0-127
        Math.round(color.g / 2),
        Math.round(color.b / 2),
        0xf7,
      ];
      output.jzzPort.send(sysex);
    } else {
      // Fallback: velocity-based color (standard MIDI)
      const velocity = this.colorToVelocity(color);
      output.jzzPort.send([0x90, note, velocity]);
    }
  }

  /**
   * Set all pad LEDs at once using SysEx bulk message.
   */
  setAllLeds(deviceId: string, colors: { note: number; color: PadColor }[]): void {
    for (const { note, color } of colors) {
      this.setLed(deviceId, note, color);
    }
  }

  /**
   * Clear all LEDs on the device.
   */
  clearAllLeds(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const model = detectModel(device.name);
    const descriptor = DEVICE_DESCRIPTORS[model];

    for (let row = 0; row < descriptor.gridRows; row++) {
      for (let col = 0; col < descriptor.gridCols; col++) {
        const note = descriptor.noteMap[row][col];
        if (note >= 0) {
          this.setLed(deviceId, note, { r: 0, g: 0, b: 0 });
        }
      }
    }
  }

  /**
   * Build the correct Programmer-mode SysEx for a given Launchpad model.
   * Returns null for unsupported / unknown models.
   */
  private buildProgrammerModeSysex(model: LaunchpadModel): number[] | null {
    const descriptor = DEVICE_DESCRIPTORS[model];
    if (!descriptor || descriptor.sysexHeader.length === 0) return null;

    switch (model) {
      // Pro MK2: F0 00 20 29 02 10 21 01 F7
      case 'launchpad_pro_mk2':
        return [0xf0, ...descriptor.sysexHeader, 0x21, 0x01, 0xf7];

      // Pro MK3: F0 00 20 29 02 0E 0E 01 F7
      case 'launchpad_pro_mk3':
        return [0xf0, ...descriptor.sysexHeader, 0x0e, 0x01, 0xf7];

      // Launchpad X: F0 00 20 29 02 0C 0E 01 F7
      case 'launchpad_x':
        return [0xf0, ...descriptor.sysexHeader, 0x0e, 0x01, 0xf7];

      // Mini MK3: F0 00 20 29 02 0D 0E 01 F7
      case 'launchpad_mini_mk3':
        return [0xf0, ...descriptor.sysexHeader, 0x0e, 0x01, 0xf7];

      // Launchpad MK2: F0 00 20 29 02 18 22 00 F7  (User-1 layout)
      case 'launchpad_mk2':
        return [0xf0, ...descriptor.sysexHeader, 0x22, 0x00, 0xf7];

      default:
        return null;
    }
  }

  /**
   * Send SysEx to enter Programmer mode for a specific device.
   * Automatically detects the model and sends the correct message.
   */
  enterProgrammerMode(deviceId: string): void {
    const output = this.outputs.get(deviceId);
    if (!output) {
      console.warn(`[MidiEngine] No output port for device ${deviceId}, skipping programmer mode`);
      return;
    }

    const device = this.devices.get(deviceId);
    if (!device) return;

    const model = detectModel(device.name);
    const sysex = this.buildProgrammerModeSysex(model);

    if (!sysex) {
      console.warn(`[MidiEngine] No programmer-mode SysEx for model '${model}' (${device.name})`);
      return;
    }

    output.jzzPort.send(sysex);
    console.log(`[MidiEngine] Sent programmer-mode SysEx for ${model} on port "${output.name}"`);
  }

  /**
   * Send Programmer-mode SysEx to the FIRST Launchpad output port only.
   * The Launchpad Pro MK2 responds on port 1 ("Launchpad Pro"), not MIDIOUT2/3.
   */
  enterProgrammerModeAll(): void {
    // Find the primary Launchpad output (the one without MIDIOUTx wrapper)
    let primaryOutput: MidiPort | null = null;
    let primaryModel: LaunchpadModel = 'unknown';

    for (const [deviceId, output] of this.outputs) {
      const device = this.devices.get(deviceId);
      if (!device) continue;

      const model = detectModel(device.name);
      if (model === 'unknown') continue;

      // Prefer the port that is NOT wrapped in MIDIOUT2/3
      const isWrapped = /^midiout\d/i.test(output.name);
      if (!primaryOutput || !isWrapped) {
        primaryOutput = output;
        primaryModel = model;
      }
      // If we found a non-wrapped port, stop looking
      if (!isWrapped) break;
    }

    if (primaryOutput && primaryModel !== 'unknown') {
      const sysex = this.buildProgrammerModeSysex(primaryModel);
      if (sysex) {
        primaryOutput.jzzPort.send(sysex);
        console.log(`[MidiEngine] Sent programmer-mode SysEx for ${primaryModel} on port "${primaryOutput.name}"`);
      }
    }
  }

  /**
   * Map RGB color to nearest velocity color index (simple approximation).
   */
  private colorToVelocity(color: PadColor): number {
    if (color.r === 0 && color.g === 0 && color.b === 0) return 0;
    // Simple mapping – Launchpad uses velocity 1-127 for different colors
    // This is a rough approximation; real mapping depends on device palette
    const brightness = Math.max(color.r, color.g, color.b);
    return Math.max(1, Math.min(127, Math.round(brightness / 2)));
  }

  getDevices(): MidiDeviceInfo[] {
    return Array.from(this.devices.values());
  }

  getDevice(id: string): MidiDeviceInfo | undefined {
    return this.devices.get(id);
  }

  private startPolling(intervalMs = 2000): void {
    this.pollTimer = setInterval(() => {
      this.scanDevices().catch(console.error);
    }, intervalMs);
  }

  async shutdown(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    for (const [id] of this.inputs) {
      this.closePort(id);
    }
    for (const [id] of this.outputs) {
      this.closePort(id);
    }
    this.devices.clear();
    console.log('[MidiEngine] Shutdown complete');
  }
}
