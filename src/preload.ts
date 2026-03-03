import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './shared/types';

/**
 * Preload script – exposes a safe API to the renderer process
 * via contextBridge. All event listeners support cleanup.
 */

function createListener(channel: string) {
  return (cb: (...args: any[]) => void) => {
    const handler = (_e: any, ...args: any[]) => cb(...args);
    ipcRenderer.on(channel, handler);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener(channel, handler);
  };
}

const api = {
  // ─── MIDI ────────────────────────────────────────────
  midi: {
    getDevices: () => ipcRenderer.invoke(IPC_CHANNELS.MIDI_DEVICES_LIST),
    onDeviceConnected: createListener(IPC_CHANNELS.MIDI_DEVICE_CONNECTED),
    onDeviceDisconnected: createListener(IPC_CHANNELS.MIDI_DEVICE_DISCONNECTED),
    onMessage: (cb: (deviceId: string, msg: any) => void) => {
      const handler = (_e: any, deviceId: string, msg: any) => cb(deviceId, msg);
      ipcRenderer.on(IPC_CHANNELS.MIDI_MESSAGE_IN, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MIDI_MESSAGE_IN, handler);
    },
    setLed: (deviceId: string, note: number, color: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.MIDI_LED_SET, deviceId, note, color),
    setAllLeds: (deviceId: string, colors: any[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.MIDI_LED_SET_ALL, deviceId, colors),
  },

  // ─── Profiles ────────────────────────────────────────
  profiles: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_LIST),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET, id),
    create: (name: string, description?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILE_CREATE, name, description),
    update: (profile: any) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_UPDATE, profile),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DELETE, id),
    activate: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_ACTIVATE, id),
    export: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_EXPORT, id),
    import: (json: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_IMPORT, json),
    onActivated: createListener(IPC_CHANNELS.PROFILE_ACTIVATE),
  },

  // ─── Pads ────────────────────────────────────────────
  pads: {
    update: (padConfig: any) => ipcRenderer.invoke(IPC_CHANNELS.PAD_UPDATE, padConfig),
    onTrigger: createListener(IPC_CHANNELS.PAD_TRIGGER),
    onUpdated: createListener(IPC_CHANNELS.PAD_UPDATE),
  },

  // ─── Layers ──────────────────────────────────────────
  layers: {
    switch: (layerId: string) => ipcRenderer.invoke(IPC_CHANNELS.LAYER_SWITCH, layerId),
    create: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.LAYER_CREATE, name),
    delete: (layerId: string) => ipcRenderer.invoke(IPC_CHANNELS.LAYER_DELETE, layerId),
    onSwitched: createListener(IPC_CHANNELS.LAYER_SWITCH),
  },

  // ─── Plugins ─────────────────────────────────────────
  plugins: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_LIST),
    execute: (pluginId: string, actionId: string, params?: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_EXECUTE, pluginId, actionId, params),
    uninstall: (pluginId: string) => ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_UNINSTALL, pluginId),
  },

  // ─── App ─────────────────────────────────────────────
  app: {
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.APP_STATE),
  },

  // ─── Settings ────────────────────────────────────────
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.APP_SETTINGS_GET),
    set: (settings: any) => ipcRenderer.invoke(IPC_CHANNELS.APP_SETTINGS_SET, settings),
  },

  // ─── Window Controls ────────────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  },

  // ─── Hotkey Recording ───────────────────────────────
  hotkey: {
    startRecording: () => ipcRenderer.invoke(IPC_CHANNELS.HOTKEY_RECORD_START),
    stopRecording: () => ipcRenderer.invoke(IPC_CHANNELS.HOTKEY_RECORD_STOP),
    onRecorded: createListener(IPC_CHANNELS.HOTKEY_RECORDED),
  },

  // ─── File Dialogs ───────────────────────────────────
  dialog: {
    openFile: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE, options),
    saveFile: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, options),
  },
};

contextBridge.exposeInMainWorld('streampad', api);

// Type augmentation for renderer
export type StreamPadAPI = typeof api;
