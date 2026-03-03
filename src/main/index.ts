import { app, BrowserWindow, Menu, Tray, nativeImage, globalShortcut } from 'electron';
import path from 'path';
import { AppController } from './core/AppController';
import { setupIpcBridge } from './ipc/IpcBridge';

let mainWindow: BrowserWindow | null = null;
let appController: AppController | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = !app.isPackaged;

// ─── Single instance lock ──────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
  let trayIcon: Electron.NativeImage;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('StreamPad');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show StreamPad', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'StreamPad',
    backgroundColor: '#0a0a10',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
  });

  // Remove default menu in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Load renderer
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (tray && !isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function bootstrap(): Promise<void> {
  // Create the AppController
  appController = new AppController();

  createTray();
  await createWindow();

  if (mainWindow && appController) {
    // Setup IPC bridge (includes window controls)
    setupIpcBridge(appController, mainWindow);

    // Initialize the controller (MIDI, profiles, plugins)
    await appController.initialize();
  }
}

// ─── App Lifecycle ──────────────────────────────────────────

app.whenReady().then(bootstrap).catch(console.error);

app.on('window-all-closed', async () => {
  if (appController) {
    await appController.shutdown();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap().catch(console.error);
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  if (appController) {
    await appController.shutdown();
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
