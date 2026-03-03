import { ipcMain, BrowserWindow, dialog, globalShortcut } from 'electron';
import { AppController } from '../core/AppController';
import { SettingsManager } from '../settings/SettingsManager';
import { IPC_CHANNELS, PadConfig, Profile } from '../../shared/types';

/**
 * IpcBridge – Connects the Electron main process (AppController)
 * to the renderer process via IPC channels.
 */
export function setupIpcBridge(appController: AppController, mainWindow: BrowserWindow): void {
  const settings = new SettingsManager();
  settings.load();

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

  ipcMain.handle(IPC_CHANNELS.PLUGIN_INSTALL, async (_event, _pluginPath: string) => {
    try {
      // Reload all plugins to pick up newly installed ones
      await appController.pluginManager.loadAll();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ─── App State ───────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.APP_STATE, () => {
    return appController.getState();
  });

  // ─── Settings ────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.APP_SETTINGS_GET, () => {
    return settings.get();
  });

  ipcMain.handle(IPC_CHANNELS.APP_SETTINGS_SET, (_event, updates: any) => {
    return settings.set(updates);
  });

  // ─── Window Controls ─────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    mainWindow.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
    mainWindow.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
    return mainWindow.isMaximized();
  });

  // ─── Hotkey Recording ────────────────────────────────────────

  let recordedKeys: Set<string> = new Set();
  let isRecording = false;

  ipcMain.handle(IPC_CHANNELS.HOTKEY_RECORD_START, () => {
    isRecording = true;
    recordedKeys.clear();

    const { webContents } = mainWindow;

    // Listen for key events on the focused window
    const keyHandler = (_event: any, input: Electron.Input) => {
      if (!isRecording) return;

      const key = input.key.toLowerCase();
      const modifiers: string[] = [];
      if (input.control) modifiers.push('ctrl');
      if (input.alt) modifiers.push('alt');
      if (input.shift) modifiers.push('shift');
      if (input.meta) modifiers.push('meta');

      // Don't add modifier-only keys as the main key
      const isModifier = ['control', 'alt', 'shift', 'meta'].includes(key);
      if (!isModifier) {
        const combo = [...modifiers, key];
        send(IPC_CHANNELS.HOTKEY_RECORDED, combo);
        isRecording = false;
      }
    };

    webContents.on('before-input-event', keyHandler);

    // Auto-stop after 10 seconds
    setTimeout(() => {
      if (isRecording) {
        isRecording = false;
        webContents.removeListener('before-input-event', keyHandler);
        send(IPC_CHANNELS.HOTKEY_RECORDED, []);
      }
    }, 10000);

    return true;
  });

  ipcMain.handle(IPC_CHANNELS.HOTKEY_RECORD_STOP, () => {
    isRecording = false;
    return true;
  });

  // ─── File Dialogs ────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async (_event, options?: any) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      ...options,
    });
    return result.canceled ? null : result.filePaths[0] || null;
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_FILE, async (_event, options?: any) => {
    const result = await dialog.showSaveDialog(mainWindow, options || {});
    return result.canceled ? null : result.filePath || null;
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
