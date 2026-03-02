import { MidiEngine } from '../midi/MidiEngine';
import { InputDetector } from '../midi/InputDetector';
import { ActionExecutor } from '../actions/ActionExecutor';
import { ProfileManager } from '../profiles/ProfileManager';
import { LedController } from '../led/LedController';
import { PluginManager } from '../plugins/PluginManager';
import { MidiMessage, InputEvent, PadConfig } from '../../shared/types';
import { noteToGrid, DEVICE_DESCRIPTORS, detectModel } from '../../shared/devices';

/**
 * AppController – Central orchestrator that connects all subsystems:
 * MIDI Engine ↔ Input Detector → Action Executor
 *                                ↗ Profile Manager
 *                                ↗ LED Controller
 *                                ↗ Plugin Manager
 */
export class AppController {
  public readonly midiEngine: MidiEngine;
  public readonly inputDetector: InputDetector;
  public readonly actionExecutor: ActionExecutor;
  public readonly profileManager: ProfileManager;
  public readonly ledController: LedController;
  public readonly pluginManager: PluginManager;

  private toggleStates: Map<string, boolean> = new Map();

  constructor() {
    this.midiEngine = new MidiEngine();
    this.inputDetector = new InputDetector();
    this.actionExecutor = new ActionExecutor();
    this.profileManager = new ProfileManager();
    this.ledController = new LedController(this.midiEngine, this.profileManager);
    this.pluginManager = new PluginManager();
  }

  /**
   * Initialize all subsystems and wire them together.
   */
  async initialize(): Promise<void> {
    console.log('[AppController] Initializing...');

    // Load profiles
    await this.profileManager.loadAll();
    console.log('[AppController] Profiles loaded');

    // Load plugins
    await this.pluginManager.loadAll();
    console.log('[AppController] Plugins loaded');

    // Wire up action executor callbacks
    this.actionExecutor.setPluginExecutor(
      (pluginId, actionId, params) => this.pluginManager.executeAction(pluginId, actionId, params)
    );
    this.actionExecutor.setProfileSwitcher((profileId) => {
      this.profileManager.activateProfile(profileId);
      this.refreshLeds();
    });
    this.actionExecutor.setLayerSwitcher((layerId) => {
      this.profileManager.switchLayer(layerId);
      this.refreshLeds();
    });

    // Connect MIDI messages to input detector
    this.midiEngine.on('midi:message', (deviceId: string, msg: MidiMessage) => {
      this.inputDetector.processMessage(deviceId, msg);
    });

    // Connect input events to action processing
    this.inputDetector.on('input', (event: {
      deviceId: string;
      note: number;
      event: InputEvent;
      value: number;
      timestamp: number;
    }) => {
      this.handleInput(event.deviceId, event.note, event.event, event.value);
    });

    // Handle device connect/disconnect
    this.midiEngine.on('device:connected', (device) => {
      console.log(`[AppController] Device connected: ${device.name}`);
      // Enter programmer mode for the device
      setTimeout(() => {
        this.midiEngine.enterProgrammerMode(device.id);
        this.refreshLeds(device.id);
      }, 500);
    });

    this.midiEngine.on('device:disconnected', (device) => {
      console.log(`[AppController] Device disconnected: ${device.name}`);
    });

    // Handle profile/layer switches → refresh LEDs
    this.profileManager.on('profile:activated', () => this.refreshLeds());
    this.profileManager.on('layer:switched', () => this.refreshLeds());

    // Initialize MIDI engine last (starts scanning)
    await this.midiEngine.initialize();
    console.log('[AppController] MIDI engine initialized');

    console.log('[AppController] Initialization complete');
  }

  /**
   * Process an input event and execute mapped actions.
   */
  private handleInput(deviceId: string, note: number, event: InputEvent, value: number): void {
    const layer = this.profileManager.getActiveLayer();
    if (!layer) return;

    // Find pad config for this note
    const pad = layer.pads.find((p) => p.midiNote === note);
    if (!pad || !pad.enabled) return;

    // Handle toggle state
    if (pad.triggerType === 'toggle' && event === 'press') {
      const key = `${deviceId}:${note}`;
      const current = this.toggleStates.get(key) || false;
      this.toggleStates.set(key, !current);

      if (!current) {
        this.ledController.setActive(deviceId, pad);
      } else {
        this.ledController.setInactive(deviceId, pad);
      }
    }

    // Handle momentary LED feedback
    if (pad.triggerType === 'momentary') {
      if (event === 'press') {
        this.ledController.setActive(deviceId, pad);
      } else if (event === 'release') {
        this.ledController.setInactive(deviceId, pad);
      }
    }

    // Handle hold LED
    if (pad.triggerType === 'hold') {
      if (event === 'press' || event === 'hold') {
        this.ledController.setActive(deviceId, pad);
      } else if (event === 'release') {
        this.ledController.setInactive(deviceId, pad);
      }
    }

    // Find and execute matching triggers
    for (const trigger of pad.triggers) {
      if (trigger.event === event) {
        for (const action of trigger.actions) {
          this.actionExecutor.execute(action).catch((err) => {
            console.error(`[AppController] Action failed:`, err);
          });
        }
      }
    }
  }

  /**
   * Refresh LEDs for all connected devices (or a specific one).
   */
  refreshLeds(specificDeviceId?: string): void {
    const devices = this.midiEngine.getDevices();
    for (const device of devices) {
      if (specificDeviceId && device.id !== specificDeviceId) continue;
      if (!device.isConnected) continue;
      this.ledController.refreshAll(device.id);
    }
  }

  /**
   * Get the current app state for the renderer.
   */
  getState() {
    return {
      devices: this.midiEngine.getDevices(),
      activeDeviceId: this.midiEngine.getDevices().find((d) => d.isConnected)?.id || null,
      profiles: this.profileManager.getAll(),
      activeProfileId: this.profileManager.getActiveProfile()?.id || null,
      plugins: this.pluginManager.getManifests(),
    };
  }

  /**
   * Shutdown all subsystems gracefully.
   */
  async shutdown(): Promise<void> {
    console.log('[AppController] Shutting down...');
    this.ledController.shutdown();
    this.inputDetector.reset();
    await this.pluginManager.shutdown();
    await this.midiEngine.shutdown();
    console.log('[AppController] Shutdown complete');
  }
}
