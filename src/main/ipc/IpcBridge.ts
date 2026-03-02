import { ipcMain, BrowserWindow } from 'electron';
import { AppController } from '../core/AppController';
import { IPC_CHANNELS, PadConfig, Profile } from '../../shared/types';

/**
 * IpcBridge – Connects the Electron main process (AppController)
 * to the renderer process via IPC channels.
 */
export function setupIpcBridge(appController: AppController, mainWindow: BrowserWindow): void {
  const send = (channel: string, ...args: any[]) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  };

  // ─── MIDI Devices ────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.MIDI_DEVICES_LIST, () => {
    return appController.midiEngine.getDevices();
  });

  // Forward device events to renderer
  appController.midiEngine.on('device:connected', (device) => {
    send(IPC_CHANNELS.MIDI_DEVICE_CONNECTED, device);
  });

  appController.midiEngine.on('device:disconnected', (device) => {
    send(IPC_CHANNELS.MIDI_DEVICE_DISCONNECTED, device);
  });

  // Forward MIDI messages to renderer (for visual feedback)
  appController.midiEngine.on('midi:message', (deviceId, msg) => {
    send(IPC_CHANNELS.MIDI_MESSAGE_IN, deviceId, msg);
  });

  // LED control from renderer
  ipcMain.handle(IPC_CHANNELS.MIDI_LED_SET, (_event, deviceId: string, note: number, color: any) => {
    appController.ledController.setLedDirect(deviceId, note, color);
  });

  ipcMain.handle(IPC_CHANNELS.MIDI_LED_SET_ALL, (_event, deviceId: string, colors: any[]) => {
    appController.midiEngine.setAllLeds(deviceId, colors);
  });

  // ─── Profiles ────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.PROFILE_LIST, () => {
    return appController.profileManager.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET, (_event, id: string) => {
    return appController.profileManager.getProfile(id);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_CREATE, (_event, name: string, description?: string) => {
    return appController.profileManager.createProfile(name, description);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_UPDATE, (_event, profile: Profile) => {
    appController.profileManager.updateProfile(profile);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DELETE, (_event, id: string) => {
    return appController.profileManager.deleteProfile(id);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_ACTIVATE, (_event, id: string) => {
    return appController.profileManager.activateProfile(id);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_EXPORT, (_event, id: string) => {
    return appController.profileManager.exportProfile(id);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_IMPORT, (_event, json: string) => {
    return appController.profileManager.importProfile(json);
  });

  // ─── Pads ────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.PAD_UPDATE, (_event, padConfig: PadConfig) => {
    appController.profileManager.updatePad(padConfig);
    return true;
  });

  // Forward input events to renderer
  appController.inputDetector.on('input', (event) => {
    send(IPC_CHANNELS.PAD_TRIGGER, event);
  });

  // ─── Layers ──────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.LAYER_SWITCH, (_event, layerId: string) => {
    return appController.profileManager.switchLayer(layerId);
  });

  ipcMain.handle(IPC_CHANNELS.LAYER_CREATE, (_event, name: string) => {
    return appController.profileManager.addLayer(name);
  });

  ipcMain.handle(IPC_CHANNELS.LAYER_DELETE, (_event, layerId: string) => {
    return appController.profileManager.deleteLayer(layerId);
  });

  // ─── Plugins ─────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.PLUGIN_LIST, () => {
    return appController.pluginManager.getManifests();
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_EXECUTE, (_event, pluginId: string, actionId: string, params?: any) => {
    return appController.pluginManager.executeAction(pluginId, actionId, params);
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_UNINSTALL, (_event, pluginId: string) => {
    return appController.pluginManager.unloadPlugin(pluginId);
  });

  // ─── App State ───────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.APP_STATE, () => {
    return appController.getState();
  });

  // ─── Profile/Layer change notifications ──────────────────────

  appController.profileManager.on('profile:activated', (profile) => {
    send(IPC_CHANNELS.PROFILE_ACTIVATE, profile);
  });

  appController.profileManager.on('layer:switched', (layer) => {
    send(IPC_CHANNELS.LAYER_SWITCH, layer);
  });

  appController.profileManager.on('pad:updated', (pad) => {
    send(IPC_CHANNELS.PAD_UPDATE, pad);
  });
}
