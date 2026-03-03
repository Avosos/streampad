// ============================================================
// StreamPad – Shared Type Definitions
// ============================================================

// --------------- MIDI Types ---------------

export interface MidiMessage {
  type: 'noteon' | 'noteoff' | 'cc' | 'aftertouch' | 'polyat';
  channel: number;   // 0-15
  note: number;      // 0-127
  velocity: number;  // 0-127
  timestamp: number; // ms
}

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  isInput: boolean;
  isOutput: boolean;
  isConnected: boolean;
}

// --------------- Color / LED ---------------

export interface PadColor {
  r: number; // 0-127 (MIDI) or 0-255 (RGB)
  g: number;
  b: number;
}

export interface LedState {
  color: PadColor;
  brightness: number; // 0-1
  animation?: 'none' | 'pulse' | 'flash' | 'rainbow';
  animationSpeed?: number; // ms per cycle
}

// --------------- Trigger Types ---------------

export type TriggerType = 'momentary' | 'toggle' | 'hold';

export type InputEvent =
  | 'press'
  | 'release'
  | 'hold'
  | 'double_press'
  | 'triple_press'
  | 'velocity'
  | 'aftertouch';

// --------------- Actions ---------------

export type ActionType =
  | 'keyboard_shortcut'
  | 'hotkey_sequence'
  | 'launch_app'
  | 'system_command'
  | 'http_request'
  | 'websocket_message'
  | 'osc_message'
  | 'plugin_action'
  | 'profile_switch'
  | 'layer_switch'
  | 'delay'
  | 'multi_action'
  | 'play_audio'
  | 'media_key'
  | 'open_folder';

export interface ActionBase {
  id: string;
  type: ActionType;
  label?: string;
}

export interface KeyboardShortcutAction extends ActionBase {
  type: 'keyboard_shortcut';
  keys: string[]; // e.g. ['ctrl', 'shift', 'a']
}

export interface HotkeySequenceAction extends ActionBase {
  type: 'hotkey_sequence';
  sequence: { keys: string[]; delayMs: number }[];
}

export interface LaunchAppAction extends ActionBase {
  type: 'launch_app';
  path: string;
  args?: string[];
}

export interface SystemCommandAction extends ActionBase {
  type: 'system_command';
  command: string;
}

export interface HttpRequestAction extends ActionBase {
  type: 'http_request';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface WebSocketMessageAction extends ActionBase {
  type: 'websocket_message';
  url: string;
  message: string;
}

export interface OscMessageAction extends ActionBase {
  type: 'osc_message';
  host: string;
  port: number;
  address: string;
  args: (string | number | boolean)[];
}

export interface PluginActionDef extends ActionBase {
  type: 'plugin_action';
  pluginId: string;
  actionId: string;
  params?: Record<string, unknown>;
}

export interface ProfileSwitchAction extends ActionBase {
  type: 'profile_switch';
  profileId: string;
}

export interface LayerSwitchAction extends ActionBase {
  type: 'layer_switch';
  layerId: string;
}

export interface DelayAction extends ActionBase {
  type: 'delay';
  delayMs: number;
}

export interface MultiAction extends ActionBase {
  type: 'multi_action';
  actions: Action[];
}

export interface PlayAudioAction extends ActionBase {
  type: 'play_audio';
  filePath: string;
  volume: number; // 0-1
}

export type MediaKeyType =
  | 'play_pause'
  | 'next_track'
  | 'prev_track'
  | 'stop'
  | 'volume_up'
  | 'volume_down'
  | 'mute';

export interface MediaKeyAction extends ActionBase {
  type: 'media_key';
  key: MediaKeyType;
}

export interface OpenFolderAction extends ActionBase {
  type: 'open_folder';
  targetLayerId: string;
  returnLayerId?: string;
}

export type Action =
  | KeyboardShortcutAction
  | HotkeySequenceAction
  | LaunchAppAction
  | SystemCommandAction
  | HttpRequestAction
  | WebSocketMessageAction
  | OscMessageAction
  | PluginActionDef
  | ProfileSwitchAction
  | LayerSwitchAction
  | DelayAction
  | MultiAction
  | PlayAudioAction
  | MediaKeyAction
  | OpenFolderAction;

// --------------- Pad Configuration ---------------

export interface PadTriggerConfig {
  event: InputEvent;
  actions: Action[];
}

export type PadShape = 'square' | 'round';

export interface PadConfig {
  id: string;
  row: number;           // 0-9 (10x10 grid including side buttons)
  col: number;           // 0-9
  midiNote: number;      // MIDI note mapped to this pad (-1 if CC)
  midiCC?: number;       // CC number for top-row buttons
  label: string;
  icon?: string;         // emoji or icon name
  image?: string;        // file path or data URL for custom image
  padShape?: PadShape;   // visual shape: square for main grid, round for side buttons (optional for migration)
  triggerType: TriggerType;
  triggers: PadTriggerConfig[];
  ledDefault: LedState;
  ledActive: LedState;
  ledInactive?: LedState;
  enabled: boolean;
}

// --------------- Layer ---------------

export interface Layer {
  id: string;
  name: string;
  pads: PadConfig[];
  isDefault: boolean;
}

// --------------- Profile ---------------

export interface Profile {
  id: string;
  name: string;
  description?: string;
  deviceId?: string;       // bound to specific device, or null for any
  layers: Layer[];
  activeLayerId: string;
  autoSwitchRules?: AutoSwitchRule[];
  createdAt: string;
  updatedAt: string;
}

export interface AutoSwitchRule {
  id: string;
  type: 'window_title' | 'process_name' | 'window_class';
  pattern: string; // regex pattern
  profileId: string;
}

// --------------- Plugin System ---------------

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;          // entry point file
  actions: PluginActionManifest[];
  settings?: PluginSettingDef[];
}

export interface PluginActionManifest {
  id: string;
  name: string;
  description: string;
  params?: PluginParamDef[];
}

export interface PluginParamDef {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  default?: unknown;
  options?: { label: string; value: unknown }[];
}

export interface PluginSettingDef {
  key: string;
  type: 'string' | 'number' | 'boolean';
  label: string;
  default?: unknown;
}

// --------------- Device Abstraction ---------------

export type LaunchpadModel =
  | 'launchpad_pro_mk2'
  | 'launchpad_pro_mk3'
  | 'launchpad_x'
  | 'launchpad_mini_mk3'
  | 'launchpad_mk2'
  | 'unknown';

export interface DeviceDescriptor {
  model: LaunchpadModel;
  name: string;
  gridRows: number;          // 10 (full layout with side buttons)
  gridCols: number;          // 10
  hasVelocity: boolean;
  hasAftertouch: boolean;
  hasPressure: boolean;
  noteMap: number[][];       // [row][col] → MIDI note (-1 = empty corner)
  sysexHeader: number[];     // SysEx manufacturer/device prefix
}

// --------------- App State ---------------

export interface AppState {
  devices: MidiDeviceInfo[];
  activeDeviceId: string | null;
  profiles: Profile[];
  activeProfileId: string | null;
  plugins: PluginManifest[];
}

// --------------- IPC Channels ---------------

export const IPC_CHANNELS = {
  // MIDI
  MIDI_DEVICES_LIST: 'midi:devices:list',
  MIDI_DEVICE_CONNECTED: 'midi:device:connected',
  MIDI_DEVICE_DISCONNECTED: 'midi:device:disconnected',
  MIDI_MESSAGE_IN: 'midi:message:in',
  MIDI_LED_SET: 'midi:led:set',
  MIDI_LED_SET_ALL: 'midi:led:set:all',

  // Profiles
  PROFILE_LIST: 'profile:list',
  PROFILE_GET: 'profile:get',
  PROFILE_CREATE: 'profile:create',
  PROFILE_UPDATE: 'profile:update',
  PROFILE_DELETE: 'profile:delete',
  PROFILE_ACTIVATE: 'profile:activate',
  PROFILE_EXPORT: 'profile:export',
  PROFILE_IMPORT: 'profile:import',

  // Pads
  PAD_UPDATE: 'pad:update',
  PAD_TRIGGER: 'pad:trigger',

  // Layers
  LAYER_SWITCH: 'layer:switch',
  LAYER_CREATE: 'layer:create',
  LAYER_DELETE: 'layer:delete',

  // Plugins
  PLUGIN_LIST: 'plugin:list',
  PLUGIN_INSTALL: 'plugin:install',
  PLUGIN_UNINSTALL: 'plugin:uninstall',
  PLUGIN_EXECUTE: 'plugin:execute',

  // App
  APP_STATE: 'app:state',
  APP_SETTINGS: 'app:settings',
  APP_SETTINGS_GET: 'app:settings:get',
  APP_SETTINGS_SET: 'app:settings:set',

  // Window controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',

  // Hotkey recording
  HOTKEY_RECORD_START: 'hotkey:record:start',
  HOTKEY_RECORD_STOP: 'hotkey:record:stop',
  HOTKEY_RECORDED: 'hotkey:recorded',

  // File dialogs
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_SAVE_FILE: 'dialog:save-file',
} as const;

// --------------- App Settings ---------------

export interface AppSettings {
  theme: 'dark' | 'light' | 'grey';
  holdThresholdMs: number;
  multiPressWindowMs: number;
  autoConnect: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  lastDeviceId: string | null;
  pluginDir: string | null;
  calibrated: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  holdThresholdMs: 500,
  multiPressWindowMs: 300,
  autoConnect: true,
  startMinimized: false,
  minimizeToTray: true,
  lastDeviceId: null,
  pluginDir: null,
  calibrated: false,
};
