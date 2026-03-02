import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './shared/types';

/**
 * Preload script – exposes a safe API to the renderer process
 * via contextBridge.
 */

const api = {
  // ─── MIDI ────────────────────────────────────────────
  midi: {
    getDevices: () => ipcRenderer.invoke(IPC_CHANNELS.MIDI_DEVICES_LIST),
    onDeviceConnected: (cb: (device: any) => void) => {
      ipcRenderer.on(IPC_CHANNELS.MIDI_DEVICE_CONNECTED, (_e, device) => cb(device));
    },
    onDeviceDisconnected: (cb: (device: any) => void) => {
      ipcRenderer.on(IPC_CHANNELS.MIDI_DEVICE_DISCONNECTED, (_e, device) => cb(device));
    },
    onMessage: (cb: (deviceId: string, msg: any) => void) => {
      ipcRenderer.on(IPC_CHANNELS.MIDI_MESSAGE_IN, (_e, deviceId, msg) => cb(deviceId, msg));
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
    onActivated: (cb: (profile: any) => void) => {
      ipcRenderer.on(IPC_CHANNELS.PROFILE_ACTIVATE, (_e, profile) => cb(profile));
    },
  },

  // ─── Pads ────────────────────────────────────────────
  pads: {
    update: (padConfig: any) => ipcRenderer.invoke(IPC_CHANNELS.PAD_UPDATE, padConfig),
    onTrigger: (cb: (event: any) => void) => {
      ipcRenderer.on(IPC_CHANNELS.PAD_TRIGGER, (_e, event) => cb(event));
    },
    onUpdated: (cb: (pad: any) => void) => {
      ipcRenderer.on(IPC_CHANNELS.PAD_UPDATE, (_e, pad) => cb(pad));
    },
  },

  // ─── Layers ──────────────────────────────────────────
  layers: {
    switch: (layerId: string) => ipcRenderer.invoke(IPC_CHANNELS.LAYER_SWITCH, layerId),
    create: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.LAYER_CREATE, name),
    delete: (layerId: string) => ipcRenderer.invoke(IPC_CHANNELS.LAYER_DELETE, layerId),
    onSwitched: (cb: (layer: any) => void) => {
      ipcRenderer.on(IPC_CHANNELS.LAYER_SWITCH, (_e, layer) => cb(layer));
    },
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
};

contextBridge.exposeInMainWorld('streampad', api);

// Type augmentation for renderer
export type StreamPadAPI = typeof api;
